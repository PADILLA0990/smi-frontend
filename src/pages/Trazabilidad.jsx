import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Route, Search, PackageSearch, ClipboardList } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTabla } from '../components/ui/Skeleton'
import { tonoAccion, TONO_ESTADO_SBO, ETIQUETA_ESTADO_SBO } from '../lib/tonos'
import { TONO_NOVEDAD } from '../lib/novedades'
import { formatearFechaHora, formatearNumero } from '../lib/formato'

// Trazabilidad (Fase E): línea de tiempo unificada de un producto o de una SBO.
// ?codigo= viene de los enlaces del inventario, las novedades y el detalle de la SBO.
export default function Trazabilidad() {
  const [parametrosUrl, setParametrosUrl] = useSearchParams()
  const codigo = parametrosUrl.get('codigo') || ''
  const [texto, setTexto] = useState(codigo)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  const consultar = useCallback(() => {
    if (!codigo) return Promise.resolve()
    return pedirJSON(`/api/trazabilidad?codigo=${encodeURIComponent(codigo)}`)
      .then(r => { setResultado(r); setError('') })
      .catch(err => { setResultado(null); setError(err.message) })
  }, [codigo])
  useEffect(() => { consultar() }, [consultar])

  const buscar = (e) => {
    e.preventDefault()
    const c = texto.trim()
    if (!c) return
    setError('')
    setParametrosUrl({ codigo: c })
  }

  const r = resultado && resultado.codigo.toLowerCase() === codigo.toLowerCase() ? resultado : null

  return (
    <div>
      <PageHeader icono={Route} titulo="Trazabilidad" subtitulo="Todo lo que le pasó a un producto o a una solicitud SBO, en orden: ingresos, reubicaciones, reservas, alistamiento, novedades, despacho y devoluciones" />

      <Card>
        <form className="filtros" onSubmit={buscar} style={{ marginBottom: 0 }}>
          <input className="input filtro-texto" style={{ flex: '1 1 280px' }} placeholder="Código de producto (001-RCM-B) o de SBO (SBO-0001)" aria-label="Código a rastrear"
            value={texto} onChange={e => setTexto(e.target.value)} />
          <button type="submit" className="btn btn--primario"><Search size={16} aria-hidden="true" /> Rastrear</button>
        </form>
      </Card>

      {codigo && !r && !error && <Card><SkeletonTabla filas={5} columnas={3} /></Card>}
      {error && codigo && <Card><EmptyState icono={Search} titulo={error} mensaje="Revise el código: puede ser de un producto o de una solicitud SBO." /></Card>}
      {!codigo && <Card><EmptyState icono={Route} titulo="Escriba un código para ver su recorrido" /></Card>}

      {r && (
        <Card titulo={<>{r.codigo} {r.tipo === 'sbo' && r.resumen && <Badge tono={TONO_ESTADO_SBO[r.resumen.estado]}>{ETIQUETA_ESTADO_SBO[r.resumen.estado]}</Badge>}</>}
          icono={r.tipo === 'sbo' ? ClipboardList : PackageSearch}
          subtitulo={r.tipo === 'sbo'
            ? `${r.resumen.beneficiario}${r.resumen.alistador ? ` · alistador ${r.resumen.alistador}` : ''}`
            : r.resumen ? `${r.resumen.descripcion} · ${r.resumen.categoria}` : 'El producto ya no existe; se muestra su historial'}
          acciones={r.tipo === 'sbo'
            ? <Link className="btn btn--secundario btn--sm" to={`/solicitudes?codigo=${encodeURIComponent(r.codigo)}`}>Abrir la solicitud</Link>
            : r.resumen && <Link className="btn btn--secundario btn--sm" to={`/inventario?q=${encodeURIComponent(r.codigo)}`}>Ver en el inventario</Link>}>
          {r.tipo === 'producto' && r.resumen && (
            <div className="detalle-datos">
              <span><b>Stock:</b> {formatearNumero(r.resumen.cantidad)}</span>
              <span><b>Reservado:</b> {formatearNumero(r.resumen.reservada)}</span>
              <span><b>Ubicación:</b> {r.resumen.ubicacion || 'Sin ubicar'}</span>
              {!r.resumen.activo && <Badge tono="gris">Inactivo</Badge>}
            </div>
          )}
          {r.tipo === 'sbo' && (
            <div className="tabla-scroll" style={{ marginBottom: 14 }}>
              <table className="tabla">
                <thead><tr><th>Producto</th><th>Descripción</th><th className="num">Solicitado</th><th className="num">Alistado</th><th className="num">Devuelto</th></tr></thead>
                <tbody>
                  {r.resumen.items.map((i, n) => (
                    <tr key={n}>
                      <td><Link className="texto-codigo enlace" to={`/trazabilidad?codigo=${encodeURIComponent(i.codigo_producto)}`}>{i.codigo_producto}</Link>{i.codigo_original && <div className="texto-suave texto-sm">sustituye a {i.codigo_original}</div>}</td>
                      <td>{i.descripcion}</td>
                      <td className="num">{formatearNumero(i.solicitada)}</td>
                      <td className="num">{formatearNumero(i.alistada)}</td>
                      <td className="num">{formatearNumero(i.devuelta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="etiqueta" style={{ marginBottom: 4 }}>Recorrido ({r.eventos.length})</h3>
          {r.eventos.length === 0 ? <p className="texto-suave">Sin movimientos registrados.</p> : (
            <ol className="traza">
              {r.eventos.map((e, n) => (
                <li key={n} className={`traza__evento traza__evento--${e.origen}`}>
                  <span className="traza__fecha texto-sm">{formatearFechaHora(e.fecha)}</span>
                  <div>
                    <Badge tono={e.origen === 'novedad' ? TONO_NOVEDAD[e.tipo] : tonoAccion(e.accion)}>{e.accion}</Badge>
                    {e.codigo && <span className="texto-codigo"> {e.codigo}</span>}
                    {e.producto && <> <Link className="texto-codigo enlace" to={`/trazabilidad?codigo=${encodeURIComponent(e.producto)}`}>{e.producto}</Link></>}
                    {e.sbo && r.tipo === 'producto' && <> <Link className="texto-codigo enlace" to={`/trazabilidad?codigo=${encodeURIComponent(e.sbo)}`}>{e.sbo}</Link></>}
                    {e.documento && <> <Link className="texto-codigo enlace" to={`/documentos/${e.documentoId}`}>{e.documento}</Link></>}
                    <div className="texto-suave">{e.detalle}</div>
                    <div className="texto-suave texto-sm">{e.usuario}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </div>
  )
}
