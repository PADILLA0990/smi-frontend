import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Scale, Plus, Save, CheckCircle2, Ban, Download, ShieldCheck, X } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Campo from '../components/ui/Campo'
import Badge from '../components/ui/Badge'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTabla } from '../components/ui/Skeleton'
import { useConfirmar, useAvisar } from '../lib/dialogos'
import { usePuede } from '../lib/auth'
import { useLista } from '../lib/catalogos'
import { formatearNumero, formatearFechaHora } from '../lib/formato'
import { aCSV, descargarArchivo } from '../lib/novedades'

const TONO_ESTADO = { ABIERTO: 'azul', CERRADO: 'verde', ANULADO: 'gris' }
const ETIQUETA_ESTADO = { ABIERTO: 'Abierto', CERRADO: 'Ajustado', ANULADO: 'Anulado' }
const ETIQUETA_ALCANCE = { TODO: 'Todo el inventario', CATEGORIA: 'Categoría', UBICACION: 'Ubicación' }
const alcanceTexto = (c) => c.alcance === 'TODO' ? ETIQUETA_ALCANCE.TODO : `${ETIQUETA_ALCANCE[c.alcance]}: ${c.filtro}`
const tonoDiferencia = (d) => d === null ? '' : d < 0 ? 'texto-peligro' : d > 0 ? 'texto-exito' : ''
const conSigno = (d) => d === null || d === undefined ? '—' : `${d > 0 ? '+' : ''}${formatearNumero(d)}`

function NuevoConteo({ onCreado }) {
  const avisar = useAvisar()
  const categorias = useLista('/api/catalogos/categorias?activos=1').datos || []
  const ubicaciones = useLista('/api/catalogos/ubicaciones?activos=1').datos || []
  const [form, setForm] = useState({ alcance: 'CATEGORIA', categoriaId: '', ubicacion: '', observaciones: '' })
  const [guardando, setGuardando] = useState(false)

  const crear = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const c = await pedirJSON('/api/conteos', { method: 'POST', body: form })
      avisar(`${c.codigo} creado con ${formatearNumero(c.lineas.length)} producto(s).`)
      onCreado(c)
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="form-fila" onSubmit={crear}>
      <Campo etiqueta="Qué contar">
        <select className="select" value={form.alcance} onChange={e => setForm({ ...form, alcance: e.target.value })}>
          {Object.entries(ETIQUETA_ALCANCE).map(([v, et]) => <option key={v} value={v}>{et}</option>)}
        </select>
      </Campo>
      {form.alcance === 'CATEGORIA' && (
        <Campo etiqueta="Categoría">
          <select className="select" required value={form.categoriaId} onChange={e => setForm({ ...form, categoriaId: e.target.value })}>
            <option value="">Elija…</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
      )}
      {form.alcance === 'UBICACION' && (
        <Campo etiqueta="Ubicación">
          <select className="select" required value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })}>
            <option value="">Elija…</option>
            {ubicaciones.map(u => <option key={u.id} value={u.codigo}>{u.codigo}{u.nombre ? ` · ${u.nombre}` : ''}</option>)}
          </select>
        </Campo>
      )}
      <Campo etiqueta="Observaciones">
        <input className="input" maxLength={500} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Opcional" />
      </Campo>
      <div>
        <button type="submit" className="btn btn--primario" disabled={guardando}><Plus size={16} aria-hidden="true" /> {guardando ? 'Creando…' : 'Crear conteo'}</button>
      </div>
    </form>
  )
}

function DetalleConteo({ conteo, onCambio, onCerrar }) {
  const puede = usePuede()
  const avisar = useAvisar()
  const confirmar = useConfirmar()
  const listaMotivos = useLista('/api/catalogos/motivos?activos=1').datos
  const motivos = (listaMotivos || []).filter(m => m.tipo === 'AJUSTE')
  // null mientras carga: el aviso de "no hay motivos" solo se muestra cuando la lista ya llegó vacía
  const sinMotivos = listaMotivos !== null && motivos.length === 0
  const abierto = conteo.estado === 'ABIERTO'
  const editable = abierto && puede('movimientos:registrar')
  const [contadas, setContadas] = useState(() => Object.fromEntries(conteo.lineas.map(l => [l.id, l.cantidad_contada ?? ''])))
  const [motivoId, setMotivoId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [soloDiferencias, setSoloDiferencias] = useState(false)
  const cambiadas = conteo.lineas.filter(l => String(contadas[l.id] ?? '') !== String(l.cantidad_contada ?? ''))

  const guardar = async () => {
    setOcupado(true)
    try {
      const data = await pedirJSON(`/api/conteos/${conteo.id}/lineas`, {
        method: 'PUT', body: { lineas: cambiadas.map(l => ({ id: l.id, cantidad_contada: contadas[l.id] === '' ? null : Number(contadas[l.id]) })) }
      })
      avisar(`${formatearNumero(cambiadas.length)} cantidad(es) guardada(s).`)
      onCambio(data)
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setOcupado(false)
    }
  }

  const aprobar = async () => {
    if (!motivoId) { avisar('Elija el motivo del ajuste.', 'error'); return }
    const { con_diferencia } = conteo.resumen
    if (!await confirmar({
      titulo: `Aprobar ajustes de ${conteo.codigo}`,
      mensaje: `Se ajustará el stock de ${formatearNumero(con_diferencia)} producto(s) según lo contado (faltan ${formatearNumero(conteo.resumen.faltantes)} y sobran ${formatearNumero(conteo.resumen.sobrantes)} unidades) y el conteo quedará cerrado. Cada ajuste queda en el historial.`,
      textoConfirmar: 'Aprobar ajustes'
    })) return
    setOcupado(true)
    try {
      const data = await pedirJSON(`/api/conteos/${conteo.id}/aprobar`, { method: 'POST', body: { motivoId, observaciones } })
      avisar(`${data.codigo}: ajustes aplicados.`)
      onCambio(data)
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setOcupado(false)
    }
  }

  const anular = async () => {
    if (!await confirmar({ titulo: `Anular ${conteo.codigo}`, mensaje: 'El conteo se descarta sin ajustar nada.', textoConfirmar: 'Anular', peligro: true })) return
    try {
      onCambio(await pedirJSON(`/api/conteos/${conteo.id}/anular`, { method: 'POST', body: {} }))
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const exportar = () => descargarArchivo(`${conteo.codigo}.csv`, aCSV([
    { titulo: 'Código', valor: l => l.codigo_producto }, { titulo: 'Descripción', valor: l => l.descripcion }, { titulo: 'Ubicación', valor: l => l.ubicacion },
    { titulo: 'Sistema', valor: l => l.cantidad_sistema }, { titulo: 'Contado', valor: l => l.cantidad_contada ?? '' },
    { titulo: 'Diferencia', valor: l => l.diferencia ?? '' }, { titulo: '%', valor: l => l.porcentaje ?? '' },
    { titulo: 'Contado por', valor: l => l.contado_por || '' }, { titulo: 'Ajuste aplicado', valor: l => l.ajuste ?? '' }
  ], conteo.lineas))

  const lineas = soloDiferencias ? conteo.lineas.filter(l => l.diferencia) : conteo.lineas

  return (
    <Card titulo={<>{conteo.codigo} <Badge tono={TONO_ESTADO[conteo.estado]}>{ETIQUETA_ESTADO[conteo.estado]}</Badge></>} icono={Scale}
      subtitulo={`${alcanceTexto(conteo)} · creado por ${conteo.creado_por} el ${formatearFechaHora(conteo.fecha_creacion)}${conteo.cerrado_por ? ` · ${conteo.estado === 'CERRADO' ? 'aprobado' : 'anulado'} por ${conteo.cerrado_por}` : ''}${conteo.motivo ? ` (${conteo.motivo.nombre})` : ''}`}
      acciones={<button className="btn btn--fantasma" onClick={onCerrar} aria-label="Cerrar detalle"><X size={20} /></button>}>
      <div className="detalle-datos">
        <span><b>Productos:</b> {formatearNumero(conteo.resumen.productos)}</span>
        <span><b>Contados:</b> {formatearNumero(conteo.resumen.contados)}</span>
        <span><b>Con diferencia:</b> {formatearNumero(conteo.resumen.con_diferencia)}</span>
        <span className="texto-peligro"><b>Faltan:</b> {formatearNumero(conteo.resumen.faltantes)} u.</span>
        <span className="texto-exito"><b>Sobran:</b> {formatearNumero(conteo.resumen.sobrantes)} u.</span>
      </div>
      {conteo.observaciones && <p className="texto-suave texto-sm">{conteo.observaciones}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '8px 0' }}>
        <label className="texto-sm"><input type="checkbox" checked={soloDiferencias} onChange={e => setSoloDiferencias(e.target.checked)} /> Solo con diferencia</label>
        <button type="button" className="btn btn--secundario btn--sm" onClick={exportar}><Download size={14} aria-hidden="true" /> Exportar (Excel)</button>
        {editable && <button type="button" className="btn btn--primario btn--sm" disabled={ocupado || cambiadas.length === 0} onClick={guardar}><Save size={14} aria-hidden="true" /> Guardar conteo{cambiadas.length > 0 && ` (${cambiadas.length})`}</button>}
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead><tr><th>Código</th><th>Descripción</th><th>Ubicación</th><th className="num">Sistema</th><th className="num">Contado</th><th className="num">Diferencia</th><th className="num">%</th>{!abierto && <th className="num">Ajuste</th>}</tr></thead>
          <tbody>
            {lineas.map(l => (
              <tr key={l.id}>
                <td><Link className="texto-codigo enlace" to={`/trazabilidad?codigo=${encodeURIComponent(l.codigo_producto)}`}>{l.codigo_producto}</Link></td>
                <td>{l.descripcion}</td>
                <td className="texto-sm">{l.ubicacion || '—'}</td>
                <td className="num">{formatearNumero(l.cantidad_sistema)}</td>
                <td className="num">
                  {editable
                    ? <input className="input input--sm" type="number" min="0" step="1" style={{ width: 90, textAlign: 'right' }} aria-label={`Cantidad contada de ${l.codigo_producto}`}
                        value={contadas[l.id] ?? ''} onChange={e => setContadas({ ...contadas, [l.id]: e.target.value })} />
                    : l.cantidad_contada === null ? '—' : formatearNumero(l.cantidad_contada)}
                </td>
                <td className={`num ${tonoDiferencia(l.diferencia)}`}><strong>{conSigno(l.diferencia)}</strong></td>
                <td className={`num ${tonoDiferencia(l.diferencia)}`}>{l.porcentaje === null ? (l.diferencia ? 'nuevo' : '—') : `${conSigno(l.porcentaje)} %`}</td>
                {!abierto && <td className="num">{conSigno(l.ajuste)}</td>}
              </tr>
            ))}
            {lineas.length === 0 && <tr><td colSpan={8} className="texto-suave">Ningún producto con diferencia.</td></tr>}
          </tbody>
        </table>
      </div>
      {editable && <p className="texto-suave texto-sm">La diferencia se calcula contra el stock del sistema en el momento de guardar lo contado.</p>}

      {abierto && puede('conciliacion:aprobar') && (
        <div className="conciliacion__aprobar">
          <Campo etiqueta="Motivo del ajuste" ayuda={sinMotivos ? 'No hay motivos de tipo Ajuste: créelos en Configuración → Motivos.' : undefined}>
            <select className="select" value={motivoId} onChange={e => setMotivoId(e.target.value)}>
              <option value="">Elija…</option>
              {motivos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Observaciones">
            <input className="input" maxLength={500} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional" />
          </Campo>
          <div style={{ display: 'flex', gap: 8, marginTop: 'calc(var(--fs-sm) * 1.5 + 5px)' }}>
            <button type="button" className="btn btn--primario" disabled={ocupado || cambiadas.length > 0 || conteo.resumen.contados === 0} onClick={aprobar}
              title={cambiadas.length > 0 ? 'Guarde el conteo antes de aprobar' : undefined}><CheckCircle2 size={16} aria-hidden="true" /> Aprobar ajustes</button>
            <button type="button" className="btn btn--peligro" disabled={ocupado} onClick={anular}><Ban size={16} aria-hidden="true" /> Anular</button>
          </div>
        </div>
      )}
    </Card>
  )
}

function Consistencia() {
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const revisar = async () => {
    setCargando(true)
    try {
      setReporte(await pedirJSON('/api/conciliacion/consistencia'))
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }
  return (
    <Card titulo="Consistencia historial ↔ stock" icono={ShieldCheck}
      subtitulo="Recalcula el stock, la ubicación y las reservas de cada producto desde el historial y lo compara con lo guardado. Solo lectura."
      acciones={<button className="btn btn--secundario" onClick={revisar} disabled={cargando}>{cargando ? 'Revisando…' : 'Revisar ahora'}</button>}>
      <ErrorState mensaje={error} onReintentar={revisar} />
      {reporte && (reporte.problemas.length === 0
        ? <p className="texto-exito"><CheckCircle2 size={16} aria-hidden="true" /> {formatearNumero(reporte.revisados)} producto(s) revisados: todo cuadra.</p>
        : <>
          <p><b>{formatearNumero(reporte.problemas.length)}</b> de {formatearNumero(reporte.revisados)} producto(s) con diferencias. Revise su trazabilidad y, si el físico es distinto, haga un conteo.</p>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Código</th><th>Campo</th><th>Según el historial</th><th>Guardado</th></tr></thead>
              <tbody>
                {reporte.problemas.flatMap(p => p.diferencias.map((d, i) => (
                  <tr key={`${p.codigo_producto}-${i}`}>
                    <td><Link className="texto-codigo enlace" to={`/trazabilidad?codigo=${encodeURIComponent(p.codigo_producto)}`}>{p.codigo_producto}</Link></td>
                    <td>{d.campo}</td><td>{String(d.esperado ?? '—')}</td><td>{String(d.guardado ?? '—')}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </>)}
    </Card>
  )
}

export default function Conciliacion() {
  const puede = usePuede()
  const [parametros, setParametros] = useSearchParams()
  const [conteos, setConteos] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [error, setError] = useState('')
  const idUrl = parametros.get('conteo')

  const cargar = useCallback(() => pedirJSON('/api/conteos').then(c => { setConteos(c); setError('') }).catch(e => setError(e.message)), [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    if (idUrl) pedirJSON(`/api/conteos/${idUrl}`).then(setDetalle).catch(e => setError(e.message))
  }, [idUrl])

  const abrir = (id) => setParametros({ conteo: String(id) })
  const alCambiar = (c) => { setDetalle(c); cargar() }
  const cerrar = () => { setDetalle(null); setParametros({}) }
  const actual = detalle && String(detalle.id) === idUrl ? detalle : null

  return (
    <div>
      <PageHeader icono={Scale} titulo="Conciliación" subtitulo="Conteos físicos, diferencias con el sistema y ajustes aprobados" />
      <ErrorState mensaje={error} onReintentar={cargar} />

      {puede('movimientos:registrar') && (
        <Card titulo="Nuevo conteo físico" icono={Plus} subtitulo="Se listan los productos activos del alcance elegido con su stock actual. Luego se registra lo contado.">
          <NuevoConteo onCreado={(c) => { cargar(); abrir(c.id) }} />
        </Card>
      )}

      {actual && <DetalleConteo key={`${actual.id}-${actual.estado}`} conteo={actual} onCambio={alCambiar} onCerrar={cerrar} />}

      <Card titulo="Conteos" icono={Scale}>
        {!conteos && !error && <SkeletonTabla filas={4} columnas={5} />}
        {conteos && conteos.length === 0 && <EmptyState icono={Scale} titulo="Aún no hay conteos" mensaje="Cree uno para comparar lo que hay en la bodega con lo que dice el sistema." />}
        {conteos && conteos.length > 0 && (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Conteo</th><th>Estado</th><th>Alcance</th><th>Creado</th><th className="num">Contados</th><th className="num">Con diferencia</th><th className="num">Faltan / sobran</th></tr></thead>
              <tbody>
                {conteos.map(c => (
                  <tr key={c.id} className={`fila-clic${String(c.id) === idUrl ? ' fila-activa' : ''}`} onClick={() => abrir(c.id)}>
                    <td><button type="button" className="enlace texto-codigo" onClick={(e) => { e.stopPropagation(); abrir(c.id) }}>{c.codigo}</button></td>
                    <td><Badge tono={TONO_ESTADO[c.estado]}>{ETIQUETA_ESTADO[c.estado]}</Badge></td>
                    <td>{alcanceTexto(c)}</td>
                    <td className="texto-sm">{c.creado_por} · {formatearFechaHora(c.fecha_creacion)}</td>
                    <td className="num">{formatearNumero(c.resumen.contados)} / {formatearNumero(c.resumen.productos)}</td>
                    <td className="num">{formatearNumero(c.resumen.con_diferencia)}</td>
                    <td className="num"><span className="texto-peligro">−{formatearNumero(c.resumen.faltantes)}</span> / <span className="texto-exito">+{formatearNumero(c.resumen.sobrantes)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {puede('conciliacion:aprobar') && <Consistencia />}
    </div>
  )
}
