import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Plus, Trash2, X, FilePlus2, ListChecks } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Campo from '../components/ui/Campo'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import ErrorState from '../components/ui/ErrorState'
import SelectBuscable from '../components/ui/SelectBuscable'
import { useConfirmar, useAvisar } from '../lib/dialogos'
import { useSesion, usePuede } from '../lib/auth'
import { TONO_ESTADO_SBO, ETIQUETA_ESTADO_SBO } from '../lib/tonos'
import { formatearFecha, formatearFechaHora, formatearFechaCalendario, formatearNumero } from '../lib/formato'

const ESTADOS = ['CREADA', 'APROBADA', 'EN_ALISTAMIENTO', 'ALISTADA', 'DESPACHADA', 'CANCELADA']

const ACCIONES = {
  aprobar:   { label: 'Aprobar',                clase: 'btn--primario' },
  iniciar:   { label: 'Iniciar alistamiento',   clase: 'btn--primario' },
  finalizar: { label: 'Finalizar alistamiento', clase: 'btn--primario' },
  despachar: { label: 'Despachar',              clase: 'btn--exito' },
  cancelar:  { label: 'Cancelar solicitud',     clase: 'btn--peligro' }
}

const ITEM_VACIO = { codigo_producto: '', cantidad_solicitada: '' }
const FORM_VACIO = { codigo_sbo: '', beneficiario: '', fecha_requerida: '', observaciones: '', items: [ITEM_VACIO] }

const BadgeEstado = ({ estado }) => <Badge tono={TONO_ESTADO_SBO[estado]}>{ETIQUETA_ESTADO_SBO[estado]}</Badge>
const libre = (p) => p.cantidad - (p.cantidad_reservada || 0)

export default function Solicitudes() {
  const { usuario } = useSesion()
  const puede = usePuede()
  const [solicitudes, setSolicitudes] = useState(null)
  const [error, setError] = useState('')
  const [productos, setProductos] = useState([])
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState(FORM_VACIO)
  const [detalle, setDetalle] = useState(null)
  // Operarios y coordinadores activos, desde la API
  const [alistadores, setAlistadores] = useState([])
  const [alistador, setAlistador] = useState('')
  const [cantidades, setCantidades] = useState({})
  const [ocupado, setOcupado] = useState(false)
  const confirmar = useConfirmar()
  const avisar = useAvisar()

  const cargarSolicitudes = useCallback(() => pedirJSON(`/api/solicitudes${filtro ? `?estado=${filtro}` : ''}`)
    .then(data => {
      setSolicitudes(data)
      setError('')
    })
    .catch(err => setError(err.message)), [filtro])

  useEffect(() => { cargarSolicitudes() }, [cargarSolicitudes])

  // Solo alimenta el autocompletado de códigos: si falla, el formulario sigue funcionando
  const cargarProductos = useCallback(() => pedirJSON('/api/productos').then(setProductos).catch(() => setProductos([])), [])
  useEffect(() => { cargarProductos() }, [cargarProductos])

  useEffect(() => {
    pedirJSON('/api/usuarios/alistadores')
      .then(lista => { setAlistadores(lista); setAlistador(actual => actual || lista[0]?.usuario || '') })
      .catch(() => setAlistadores([]))
  }, [])

  const opcionesProductos = productos.map(p => ({ valor: p.codigo_producto, etiqueta: p.descripcion, detalle: `libre ${formatearNumero(libre(p))}` }))

  const abrirDetalle = async (id) => {
    try {
      const data = await pedirJSON(`/api/solicitudes/${id}`)
      setDetalle(data)
      setCantidades(Object.fromEntries(data.items.map(item => [item.id, item.cantidad_alistada || item.cantidad_solicitada])))
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const actualizarItem = (index, campo, valor) => {
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === index ? { ...item, [campo]: valor } : item) }))
  }

  const crearSolicitud = async (e) => {
    e.preventDefault()
    setOcupado(true)
    try {
      const data = await pedirJSON('/api/solicitudes', {
        method: 'POST',
        body: {
          ...form,
          fecha_requerida: form.fecha_requerida || null,
          items: form.items.map(item => ({ ...item, cantidad_solicitada: parseInt(item.cantidad_solicitada) }))
        }
      })
      avisar(`Solicitud ${data.codigo_sbo} creada por ${usuario.usuario}.`)
      setForm(FORM_VACIO)
      cargarSolicitudes()
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setOcupado(false)
    }
  }

  const ejecutarAccion = async (accion) => {
    if (accion === 'cancelar' && !await confirmar({
      titulo: `Cancelar ${detalle.codigo_sbo}`,
      mensaje: 'La solicitud quedará cancelada y se liberará el stock reservado. Esta acción no se puede deshacer.',
      textoConfirmar: 'Cancelar solicitud', textoCancelar: 'Volver', peligro: true
    })) return
    if (accion === 'despachar' && !await confirmar({
      titulo: `Despachar ${detalle.codigo_sbo}`,
      mensaje: `Se descontarán del inventario las unidades alistadas y se entregarán a ${detalle.beneficiario}.`,
      textoConfirmar: 'Despachar'
    })) return

    setOcupado(true)
    try {
      const data = await pedirJSON(`/api/solicitudes/${detalle.id}/transicion`, {
        method: 'POST',
        body: {
          accion,
          alistador: accion === 'iniciar' ? alistador : undefined,
          cantidades: accion === 'finalizar' ? Object.fromEntries(Object.entries(cantidades).map(([id, n]) => [id, parseInt(n)])) : undefined
        }
      })
      setDetalle(data)
      avisar(`${data.codigo_sbo}: ${ETIQUETA_ESTADO_SBO[data.estado].toLowerCase()}.`)
      cargarSolicitudes()
      cargarProductos()
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setOcupado(false)
    }
  }

  const columnas = [
    { id: 'codigo_sbo', titulo: 'SBO', fija: true, render: s => <span className="texto-codigo">{s.codigo_sbo}</span> },
    { id: 'beneficiario', titulo: 'Beneficiario' },
    { id: 'estado', titulo: 'Estado', valor: s => ETIQUETA_ESTADO_SBO[s.estado], render: s => <BadgeEstado estado={s.estado} /> },
    { id: 'items', titulo: 'Ítems', alinear: 'num', valor: s => s.items.length },
    { id: 'alistador', titulo: 'Alistador', valor: s => s.alistador || '—' },
    { id: 'fecha_requerida', titulo: 'Requerida', valor: s => s.fecha_requerida, render: s => formatearFechaCalendario(s.fecha_requerida) },
    { id: 'fecha_solicitud', titulo: 'Creada', valor: s => s.fecha_solicitud, render: s => <span className="texto-suave texto-sm">{formatearFecha(s.fecha_solicitud)}</span> }
  ]

  return (
    <div>
      <PageHeader icono={ClipboardList} titulo="Solicitudes SBO" subtitulo="Pedidos de las organizaciones beneficiarias: aprobación, alistamiento y despacho" />

      <ErrorState mensaje={error} onReintentar={() => { setError(''); cargarSolicitudes() }} />

      {puede('sbo:crear') && <Card titulo="Nueva solicitud" icono={FilePlus2}>
        <form onSubmit={crearSolicitud}>
          <div className="form-fila" style={{ marginBottom: 18 }}>
            <Campo etiqueta="Código SBO">
              <input className="input" placeholder="Ej: SBO-2026-001" value={form.codigo_sbo} onChange={e => setForm({ ...form, codigo_sbo: e.target.value })} required />
            </Campo>
            <Campo etiqueta="Beneficiario / organización" tamano="ancho">
              <input className="input" placeholder="Ej: Fundación XYZ" value={form.beneficiario} onChange={e => setForm({ ...form, beneficiario: e.target.value })} required />
            </Campo>
            <Campo etiqueta="Fecha requerida" tamano="angosto">
              <input className="input" type="date" value={form.fecha_requerida} onChange={e => setForm({ ...form, fecha_requerida: e.target.value })} style={{ minWidth: 150 }} />
            </Campo>
            <Campo etiqueta="Observaciones" tamano="completo">
              <input className="input" placeholder="Opcional" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </Campo>
          </div>

          <p className="etiqueta" style={{ marginBottom: 6 }}>Productos solicitados</p>
          {form.items.map((item, index) => {
            const prod = productos.find(p => p.codigo_producto === item.codigo_producto)
            const excede = prod && Number(item.cantidad_solicitada) > libre(prod)
            return (
              <div key={index} className="form-fila" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 260px' }}>
                  <SelectBuscable
                    opciones={opcionesProductos}
                    valor={item.codigo_producto}
                    required
                    placeholder="Buscar código o descripción"
                    mensajeVacio="Ese código no está en el inventario"
                    onChange={codigo => actualizarItem(index, 'codigo_producto', codigo)}
                  />
                </div>
                <div style={{ flex: '0 0 130px' }}>
                  <input className="input" type="number" min="1" step="1" placeholder="Cantidad" aria-label="Cantidad solicitada"
                    value={item.cantidad_solicitada} onChange={e => actualizarItem(index, 'cantidad_solicitada', e.target.value)} required />
                  {excede && <span className="campo__ayuda campo__ayuda--aviso">Solo hay {formatearNumero(libre(prod))} libres</span>}
                </div>
                <button type="button" className="btn btn--fantasma" disabled={form.items.length === 1} aria-label="Quitar producto"
                  onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>
                  <Trash2 size={18} />
                </button>
              </div>
            )
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <button type="button" className="btn btn--secundario" onClick={() => setForm({ ...form, items: [...form.items, ITEM_VACIO] })}>
              <Plus size={16} aria-hidden="true" /> Agregar producto
            </button>
            <button type="submit" className="btn btn--exito" disabled={ocupado}>Crear solicitud</button>
          </div>
        </form>
      </Card>}

      {detalle && (
        <Card
          titulo={<>{detalle.codigo_sbo} <BadgeEstado estado={detalle.estado} /></>}
          icono={ListChecks}
          acciones={<button className="btn btn--fantasma" onClick={() => setDetalle(null)} aria-label="Cerrar detalle"><X size={20} /></button>}
        >
          <div className="detalle-datos">
            <span><b>Beneficiario:</b> {detalle.beneficiario}</span>
            <span><b>Creada por:</b> {detalle.creado_por}</span>
            {detalle.alistador && <span><b>Alistador:</b> {detalle.alistador}</span>}
            {detalle.fecha_requerida && <span><b>Requerida:</b> {formatearFechaCalendario(detalle.fecha_requerida)}</span>}
          </div>
          {detalle.observaciones && <p className="texto-suave texto-sm" style={{ marginBottom: 12 }}>{detalle.observaciones}</p>}

          <div className="tabla-scroll" style={{ marginBottom: 18 }}>
            <table className="tabla">
              <thead>
                <tr><th>Código</th><th>Descripción</th><th className="num">Solicitada</th><th className="num">Alistada</th></tr>
              </thead>
              <tbody>
                {detalle.items.map(item => (
                  <tr key={item.id}>
                    <td className="texto-codigo">{item.codigo_producto}</td>
                    <td>{item.descripcion}</td>
                    <td className="num">{formatearNumero(item.cantidad_solicitada)}</td>
                    <td className="num">
                      {detalle.estado === 'EN_ALISTAMIENTO' ? (
                        <input className="input input--sm" type="number" min="0" max={item.cantidad_solicitada} aria-label={`Cantidad alistada de ${item.codigo_producto}`}
                          value={cantidades[item.id]} onChange={e => setCantidades({ ...cantidades, [item.id]: e.target.value })} style={{ width: 90, textAlign: 'right' }} />
                      ) : formatearNumero(item.cantidad_alistada)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detalle.acciones.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
              {detalle.acciones.includes('iniciar') && (
                <select className="select" style={{ width: 'auto' }} value={alistador} onChange={e => setAlistador(e.target.value)} aria-label="Alistador">
                  {alistadores.length === 0 && <option value="">No hay alistadores activos</option>}
                  {alistadores.map(a => <option key={a.usuario} value={a.usuario}>Alistador: {a.nombre} ({a.usuario})</option>)}
                </select>
              )}
              {detalle.acciones.map(accion => (
                <button key={accion} className={`btn ${ACCIONES[accion].clase}`} disabled={ocupado} onClick={() => ejecutarAccion(accion)}>
                  {ACCIONES[accion].label}
                </button>
              ))}
            </div>
          )}

          <h3 className="etiqueta" style={{ marginBottom: 4 }}>Trazabilidad</h3>
          <ol className="linea-tiempo">
            {detalle.eventos.map(ev => (
              <li key={ev.id}>
                <span>{formatearFechaHora(ev.fecha)}</span>
                {ev.estado_anterior && <><BadgeEstado estado={ev.estado_anterior} /> →</>}
                <BadgeEstado estado={ev.estado_nuevo} />
                <span>{ev.usuario}{ev.nota && ` · ${ev.nota}`}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card titulo="Solicitudes">
        <DataTable
          idTabla="solicitudes"
          columnas={columnas}
          filas={error && !solicitudes ? [] : solicitudes}
          busqueda="Buscar por SBO, beneficiario o alistador…"
          ordenInicial={{ id: 'fecha_solicitud', dir: 'desc' }}
          onFilaClick={s => abrirDetalle(s.id)}
          filaActiva={detalle?.id}
          vacio={{ icono: ClipboardList, titulo: filtro ? 'No hay solicitudes en ese estado' : 'No hay solicitudes registradas' }}
          herramientas={
            <select className="select select--sm" style={{ width: 'auto' }} value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar por estado">
              <option value="">Todos los estados</option>
              {ESTADOS.map(est => <option key={est} value={est}>{ETIQUETA_ESTADO_SBO[est]}</option>)}
            </select>
          }
        />
      </Card>
    </div>
  )
}
