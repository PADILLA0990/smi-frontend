import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, FilterX, Download } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import ErrorState from '../components/ui/ErrorState'
import { useAvisar } from '../lib/dialogos'
import { useConsultaPaginada } from '../lib/paginado'
import { armarConsulta } from '../lib/consulta'
import { formatearFecha, formatearHora, formatearFechaHora, formatearNumero } from '../lib/formato'
import { TIPOS_NOVEDAD, TONO_NOVEDAD, aCSV, descargarArchivo } from '../lib/novedades'

const POR_PAGINA = 25
const FILTROS_VACIOS = { tipo: '', sbo: '', desde: '', hasta: '' }

const enlaceTraza = (codigo) => <Link className="texto-codigo enlace" to={`/trazabilidad?codigo=${encodeURIComponent(codigo)}`} title="Ver la trazabilidad">{codigo}</Link>

const columnas = [
  { id: 'fecha', titulo: 'Fecha y hora', ordenable: false, render: n => <span className="texto-suave texto-sm">{formatearFecha(n.fecha)}<br />{formatearHora(n.fecha)}</span> },
  { id: 'codigo', titulo: 'Novedad', ordenable: false, render: n => <span className="texto-codigo">{n.codigo}</span> },
  { id: 'tipo', titulo: 'Tipo', ordenable: false, render: n => <Badge tono={TONO_NOVEDAD[n.tipo]}>{TIPOS_NOVEDAD[n.tipo]}</Badge> },
  {
    id: 'sbo', titulo: 'SBO', ordenable: false,
    render: n => n.solicitud
      ? <Link className="texto-codigo enlace" to={`/solicitudes?codigo=${encodeURIComponent(n.solicitud.codigo_sbo)}`} title={n.solicitud.beneficiario}>{n.solicitud.codigo_sbo}</Link>
      : <span className="texto-suave">—</span>
  },
  { id: 'producto', titulo: 'Producto', ordenable: false, render: n => <>{enlaceTraza(n.codigo_producto)}{n.codigo_sustituto && <> → {enlaceTraza(n.codigo_sustituto)}</>}</> },
  { id: 'cantidad', titulo: 'Cantidad', alinear: 'num', ordenable: false, render: n => formatearNumero(n.cantidad) },
  { id: 'descripcion', titulo: 'Descripción', ordenable: false, render: n => <span className="texto-suave">{n.descripcion}{n.motivo && ` · ${n.motivo.nombre}`}</span> },
  { id: 'usuario', titulo: 'Usuario', ordenable: false }
]

const COLUMNAS_CSV = [
  { titulo: 'Fecha', valor: n => formatearFechaHora(n.fecha) },
  { titulo: 'Novedad', valor: n => n.codigo },
  { titulo: 'Tipo', valor: n => TIPOS_NOVEDAD[n.tipo] },
  { titulo: 'SBO', valor: n => n.solicitud?.codigo_sbo || '' },
  { titulo: 'Organización', valor: n => n.solicitud?.beneficiario || '' },
  { titulo: 'Producto', valor: n => n.codigo_producto },
  { titulo: 'Sustituto', valor: n => n.codigo_sustituto || '' },
  { titulo: 'Cantidad', valor: n => n.cantidad },
  { titulo: 'Motivo', valor: n => n.motivo?.nombre || '' },
  { titulo: 'Descripción', valor: n => n.descripcion },
  { titulo: 'Usuario', valor: n => n.usuario }
]

export default function Novedades() {
  const avisar = useAvisar()
  const [parametrosUrl, setParametrosUrl] = useSearchParams()
  const filtros = Object.fromEntries(Object.keys(FILTROS_VACIOS).map(k => [k, parametrosUrl.get(k) || '']))
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const [exportando, setExportando] = useState(false)
  const { datos, total, resumen, error, recargar } = useConsultaPaginada('/api/novedades', { pagina, porPagina: POR_PAGINA, q: texto.trim(), ...filtros })

  const cambiarFiltro = (campo, valor) => {
    const nuevos = new URLSearchParams(parametrosUrl)
    if (valor) nuevos.set(campo, valor)
    else nuevos.delete(campo)
    setParametrosUrl(nuevos, { replace: true })
    setPagina(1)
  }
  const hayFiltros = texto || Object.values(filtros).some(Boolean)

  // Exporta todas las novedades que cumplen los filtros (no solo la página visible)
  const exportar = async () => {
    setExportando(true)
    try {
      const todas = await pedirJSON(`/api/novedades?${armarConsulta({ q: texto.trim(), ...filtros })}`)
      const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' })
      descargarArchivo(`novedades-${hoy}.csv`, aCSV(COLUMNAS_CSV, todas))
      avisar(`${formatearNumero(todas.length)} novedad(es) exportadas.`)
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div>
      <PageHeader icono={AlertCircle} titulo="Novedades" subtitulo="Faltantes, daños, tallas, sustituciones y devoluciones de las solicitudes SBO"
        acciones={<button className="btn btn--secundario" onClick={exportar} disabled={exportando || total === 0}><Download size={16} aria-hidden="true" /> {exportando ? 'Exportando…' : 'Exportar (Excel)'}</button>} />

      <ErrorState mensaje={error} onReintentar={recargar} />

      {resumen && Object.keys(resumen).length > 0 && (
        <div className="resumen-novedades">
          {Object.entries(TIPOS_NOVEDAD).filter(([t]) => resumen[t]).map(([t, etiqueta]) => (
            <button key={t} type="button" className={`btn btn--fantasma btn--sm${filtros.tipo === t ? ' activo' : ''}`} onClick={() => cambiarFiltro('tipo', filtros.tipo === t ? '' : t)}>
              <Badge tono={TONO_NOVEDAD[t]}>{etiqueta}</Badge> {formatearNumero(resumen[t])}
            </button>
          ))}
        </div>
      )}

      <Card>
        <div className="filtros">
          <label className="filtro-fecha">Desde <input className="input" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={e => cambiarFiltro('desde', e.target.value)} /></label>
          <label className="filtro-fecha">Hasta <input className="input" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={e => cambiarFiltro('hasta', e.target.value)} /></label>
          <select className="select" aria-label="Tipo de novedad" value={filtros.tipo} onChange={e => cambiarFiltro('tipo', e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_NOVEDAD).map(([t, et]) => <option key={t} value={t}>{et}</option>)}
          </select>
          <input className="input filtro-texto" placeholder="Código SBO" aria-label="Código SBO" value={filtros.sbo} onChange={e => cambiarFiltro('sbo', e.target.value)} />
          {hayFiltros && (
            <button type="button" className="btn btn--secundario btn--sm" onClick={() => { setParametrosUrl({}, { replace: true }); setTexto(''); setPagina(1) }}>
              <FilterX size={14} aria-hidden="true" /> Limpiar
            </button>
          )}
        </div>
        <DataTable
          idTabla="novedades-v1"
          columnas={columnas}
          filas={datos}
          porPagina={POR_PAGINA}
          busqueda="Buscar en código, producto, SBO, descripción o usuario…"
          servidor={{
            total, pagina, onPagina: setPagina,
            orden: { id: 'fecha', dir: 'desc' }, onOrden: () => {},
            texto, onTexto: (t) => { setTexto(t); setPagina(1) }
          }}
          vacio={hayFiltros
            ? { icono: FilterX, titulo: 'Ninguna novedad cumple los filtros' }
            : { icono: AlertCircle, titulo: 'No hay novedades registradas', mensaje: 'Se registran desde el detalle de una solicitud SBO (aprobada, en alistamiento, alistada o despachada).' }}
        />
      </Card>
    </div>
  )
}
