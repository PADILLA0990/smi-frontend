import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ListChecks, Printer, History, AlertTriangle, Clock, AlertCircle, Repeat, Undo2, Route } from 'lucide-react'
import { pedirJSON } from '../../api'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { useConfirmar, useAvisar } from '../../lib/dialogos'
import { TONO_ESTADO_SBO, ETIQUETA_ESTADO_SBO } from '../../lib/tonos'
import { formatearFechaHora, formatearFechaCalendario, formatearFecha, formatearNumero } from '../../lib/formato'
import { ACCIONES_SBO, formatearDuracion, textoVencimiento, esParcial } from '../../lib/solicitudes'
import { usePuede } from '../../lib/auth'
import { TIPOS_NOVEDAD, TONO_NOVEDAD, ESTADOS_CON_NOVEDAD, ESTADOS_SUSTITUCION } from '../../lib/novedades'
import ModalNovedad from './ModalNovedad'

export const BadgeEstado = ({ estado }) => <Badge tono={TONO_ESTADO_SBO[estado]}>{ETIQUETA_ESTADO_SBO[estado]}</Badge>

// Detalle de una SBO: ítems (solicitado, reservado, alistado, despachado), avisos, tiempos,
// acciones según el estado y el rol, y la línea de tiempo de estados.
// El padre le pone una key por solicitud y estado: al cambiar, las cantidades y la nota empiezan de nuevo.
export default function DetalleSolicitud({ solicitud, alistadores, productos = [], onCambio, onCerrar }) {
  const confirmar = useConfirmar()
  const puede = usePuede()
  const [modal, setModal] = useState(null) // { modo, item }
  const avisar = useAvisar()
  const s = solicitud
  const [elegido, setAlistador] = useState('')
  const alistador = elegido || alistadores[0]?.usuario || ''
  const [cantidades, setCantidades] = useState(() => Object.fromEntries(s.items.map(item => [item.id, item.cantidad_alistada || item.cantidad_solicitada])))
  const [nota, setNota] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const parcial = s.estado === 'EN_ALISTAMIENTO' && esParcial(s.items, cantidades)
  const vencimiento = textoVencimiento(s)

  const ejecutar = async (accion) => {
    if (accion === 'cancelar' && !await confirmar({
      titulo: `Cancelar ${s.codigo_sbo}`,
      mensaje: 'La solicitud quedará cancelada y se liberará el stock reservado. Esta acción no se puede deshacer.',
      textoConfirmar: 'Cancelar solicitud', textoCancelar: 'Volver', peligro: true
    })) return
    if (accion === 'despachar' && !await confirmar({
      titulo: `Despachar ${s.codigo_sbo}`,
      mensaje: `Se descontarán del inventario las unidades alistadas y se entregarán a ${s.beneficiario}.`,
      textoConfirmar: 'Despachar'
    })) return
    if (accion === 'finalizar' && parcial && nota.trim().length < 5) {
      avisar('Alistamiento parcial: explique en la nota por qué faltan unidades.', 'error')
      return
    }

    setOcupado(true)
    try {
      const data = await pedirJSON(`/api/solicitudes/${s.id}/transicion`, {
        method: 'POST',
        body: {
          accion,
          alistador: accion === 'iniciar' ? alistador : undefined,
          cantidades: accion === 'finalizar' ? Object.fromEntries(Object.entries(cantidades).map(([id, n]) => [id, parseInt(n)])) : undefined,
          nota: nota.trim() || undefined
        }
      })
      avisar(accion === 'renovar'
        ? `${data.codigo_sbo}: renovada, el conteo de vencimiento vuelve a empezar.`
        : `${data.codigo_sbo}: ${ETIQUETA_ESTADO_SBO[data.estado].toLowerCase()}.`)
      onCambio(data)
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setOcupado(false)
    }
  }

  const fechaAlistada = ['ALISTADA', 'DESPACHADA'].includes(s.estado)
  // Fase E: qué puede hacer el usuario con cada ítem
  const accionesItem = (item) => [
    ESTADOS_CON_NOVEDAD.includes(s.estado) && puede('sbo:alistar') && { modo: 'novedad', icono: AlertCircle, texto: 'Novedad' },
    ESTADOS_SUSTITUCION.includes(s.estado) && puede('sbo:alistar') && { modo: 'sustituir', icono: Repeat, texto: 'Sustituir' },
    s.estado === 'DESPACHADA' && puede('movimientos:registrar') && item.cantidad_alistada - (item.cantidad_devuelta || 0) > 0 && { modo: 'devolver', icono: Undo2, texto: 'Devolución' }
  ].filter(Boolean)
  const conAccionesItem = s.items.some(item => accionesItem(item).length > 0)
  const novedades = s.novedades || []

  return (
    <Card
      titulo={<>{s.codigo_sbo} <BadgeEstado estado={s.estado} /></>}
      icono={ListChecks}
      acciones={<button className="btn btn--fantasma" onClick={onCerrar} aria-label="Cerrar detalle"><X size={20} /></button>}
    >
      {(s.atrasada || s.por_vencer) && (
        <div className="aviso-alerta" role="status" style={{ marginBottom: 14 }}>
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            {s.atrasada && <div><b>Atrasada:</b> la organización la necesitaba para el {formatearFechaCalendario(s.fecha_requerida)}.</div>}
            {s.por_vencer && <div><b>{vencimiento}:</b> lleva {formatearNumero(s.dias_sin_movimiento)} días sin movimiento. Muévala, renuévela o cancélela; si vence, se libera lo reservado.</div>}
          </div>
        </div>
      )}

      <div className="detalle-datos">
        <span><b>Organización:</b> {s.beneficiario}</span>
        <span><b>Creada por:</b> {s.creado_por} · {formatearFecha(s.fecha_solicitud)}</span>
        {s.alistador && <span><b>Alistador:</b> {s.alistador}</span>}
        {s.fecha_requerida && <span><b>Requerida:</b> {formatearFechaCalendario(s.fecha_requerida)}</span>}
        {vencimiento && !s.por_vencer && <span><b>Vencimiento:</b> {vencimiento.toLowerCase()} sin movimiento</span>}
        {s.estado === 'VENCIDA' && <span><b>Venció:</b> {formatearFechaHora(s.fecha_vencimiento)}</span>}
      </div>
      {s.observaciones && <p className="texto-suave texto-sm" style={{ marginBottom: 12 }}>{s.observaciones}</p>}

      <div className="tabla-scroll" style={{ marginBottom: 14 }}>
        <table className="tabla">
          <thead>
            <tr><th>Referencia</th><th>Descripción</th><th className="num">Solicitado</th><th className="num">Reservado</th><th className="num">Alistado</th><th className="num">Despachado</th>{conAccionesItem && <th className="no-imprimir">Novedades</th>}</tr>
          </thead>
          <tbody>
            {s.items.map(item => (
              <tr key={item.id}>
                <td className="texto-codigo">{item.referencia}</td>
                <td>{item.descripcion}{item.codigo_original && <div className="texto-suave texto-sm">Sustituye a {item.codigo_original}</div>}</td>
                <td className="num">{formatearNumero(item.cantidad_solicitada)}</td>
                <td className="num">{formatearNumero(item.cantidad_reservada)}</td>
                <td className="num">
                  {s.estado === 'EN_ALISTAMIENTO' && s.acciones.includes('finalizar') ? (
                    <input className="input input--sm" type="number" min="0" max={item.cantidad_solicitada} aria-label={`Cantidad alistada de ${item.referencia}`}
                      value={cantidades[item.id] ?? ''} onChange={e => setCantidades({ ...cantidades, [item.id]: e.target.value })} style={{ width: 90, textAlign: 'right' }} />
                  ) : fechaAlistada ? formatearNumero(item.cantidad_alistada) : '—'}
                </td>
                <td className="num">{s.estado === 'DESPACHADA' ? <><strong>{formatearNumero(item.cantidad_despachada)}</strong>{item.cantidad_devuelta > 0 && <div className="texto-suave texto-sm">devuelto {formatearNumero(item.cantidad_devuelta)}</div>}</> : '—'}</td>
                {conAccionesItem && (
                  <td className="no-imprimir">
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {accionesItem(item).map(a => (
                        <button key={a.modo} type="button" className="btn btn--fantasma btn--sm" onClick={() => setModal({ modo: a.modo, item })}>
                          <a.icono size={14} aria-hidden="true" /> {a.texto}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="detalle-datos texto-sm">
        <span><Clock size={14} aria-hidden="true" /> <b>Espera de aprobación:</b> {formatearDuracion(s.tiempos.espera_aprobacion_min)}</span>
        <span>
          <b>Alistamiento:</b> {formatearDuracion(s.tiempos.alistamiento_min)}
          {s.tiempos.excede_meta && <> <Badge tono="naranja">Supera la meta de {formatearDuracion(s.tiempos.meta_alistamiento_min)}</Badge></>}
        </span>
        <span><b>Total hasta el despacho:</b> {formatearDuracion(s.tiempos.total_min)}</span>
      </div>

      {s.acciones.length > 0 && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          {(s.acciones.some(a => ['finalizar', 'cancelar', 'renovar'].includes(a))) && (
            <input className="input" maxLength={300} value={nota} onChange={e => setNota(e.target.value)}
              aria-label="Nota" placeholder={parcial ? 'Obligatoria: ¿por qué faltan unidades?' : 'Nota (opcional): motivo de la cancelación, la renovación o el alistamiento'} />
          )}
          {parcial && <span className="campo__ayuda campo__ayuda--aviso">Alistamiento parcial: la nota es obligatoria.</span>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {s.acciones.includes('iniciar') && (
              <select className="select" style={{ width: 'auto' }} value={alistador} onChange={e => setAlistador(e.target.value)} aria-label="Alistador">
                {alistadores.length === 0 && <option value="">No hay alistadores activos</option>}
                {alistadores.map(a => <option key={a.usuario} value={a.usuario}>Alistador: {a.nombre} ({a.usuario})</option>)}
              </select>
            )}
            {s.acciones.map(accion => (
              <button key={accion} className={`btn ${ACCIONES_SBO[accion].clase}`} disabled={ocupado} onClick={() => ejecutar(accion)}>
                {ACCIONES_SBO[accion].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Link className="btn btn--secundario btn--sm" to={`/solicitudes/${encodeURIComponent(s.codigo_sbo)}/remision`}>
          <Printer size={14} aria-hidden="true" /> Remisión
        </Link>
        <Link className="btn btn--secundario btn--sm" to={`/historial?sbo=${encodeURIComponent(s.codigo_sbo)}`}>
          <History size={14} aria-hidden="true" /> Ver en el historial
        </Link>
        <Link className="btn btn--secundario btn--sm" to={`/trazabilidad?codigo=${encodeURIComponent(s.codigo_sbo)}`}>
          <Route size={14} aria-hidden="true" /> Trazabilidad
        </Link>
      </div>

      {novedades.length > 0 && (<>
        <h3 className="etiqueta" style={{ marginBottom: 4 }}>Novedades ({novedades.length})</h3>
        <ul className="lista-novedades">
          {novedades.map(n => (
            <li key={n.id}>
              <Badge tono={TONO_NOVEDAD[n.tipo]}>{TIPOS_NOVEDAD[n.tipo]}</Badge>
              <span className="texto-codigo">{n.codigo}</span>
              <span>{formatearNumero(n.cantidad)} u. de <b>{n.codigo_producto}</b>{n.codigo_sustituto && <> → <b>{n.codigo_sustituto}</b></>}{n.motivo && <> · {n.motivo.nombre}</>}</span>
              <span className="texto-suave">{n.descripcion}</span>
              <span className="texto-suave texto-sm">{n.usuario} · {formatearFechaHora(n.fecha)}</span>
            </li>
          ))}
        </ul>
      </>)}

      <h3 className="etiqueta" style={{ marginBottom: 4 }}>Línea de tiempo</h3>
      <ol className="linea-tiempo">
        {s.eventos.map(ev => (
          <li key={ev.id}>
            <span>{formatearFechaHora(ev.fecha)}</span>
            {ev.estado_anterior && ev.estado_anterior !== ev.estado_nuevo && <><BadgeEstado estado={ev.estado_anterior} /> →</>}
            {ev.estado_anterior === ev.estado_nuevo ? <Badge tono="cian">Renovada</Badge> : <BadgeEstado estado={ev.estado_nuevo} />}
            <span>{ev.usuario}{ev.nota && ` · ${ev.nota}`}</span>
          </li>
        ))}
      </ol>

      {modal && (
        <ModalNovedad solicitud={s} item={modal.item} modo={modal.modo} productos={productos}
          onCerrar={() => setModal(null)} onListo={(data) => { setModal(null); onCambio(data) }} />
      )}
    </Card>
  )
}
