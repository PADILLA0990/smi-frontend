import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { History, FilterX } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import ErrorState from '../components/ui/ErrorState'
import { useLista } from '../lib/catalogos'
import { useConsultaPaginada } from '../lib/paginado'
import { tonoAccion } from '../lib/tonos'
import { formatearFecha, formatearHora } from '../lib/formato'

const POR_PAGINA = 25
const FILTROS_VACIOS = { desde: '', hasta: '', codigo: '', accion: '', operario: '', sbo: '' }

const columnas = [
  {
    id: 'fecha', titulo: 'Fecha y hora', ordenable: false,
    render: r => <span className="texto-suave texto-sm">{formatearFecha(r.fecha)}<br />{formatearHora(r.fecha)}</span>
  },
  {
    id: 'codigo_producto', titulo: 'Código', ordenable: false,
    // Los eventos SBO enlazan al detalle de la solicitud; el resto, al producto en el inventario
    render: r => r.es_sbo
      ? <Link className="texto-codigo enlace" to={`/solicitudes?codigo=${encodeURIComponent(r.codigo_producto)}`} title="Ver la solicitud">{r.codigo_producto}</Link>
      : <Link className="texto-codigo enlace" to={`/inventario?q=${encodeURIComponent(r.codigo_producto)}`}>{r.codigo_producto}</Link>
  },
  { id: 'accion', titulo: 'Acción', ordenable: false, render: r => <Badge tono={tonoAccion(r.accion)}>{r.accion}</Badge> },
  { id: 'operario', titulo: 'Operario', ordenable: false },
  {
    id: 'sbo', titulo: 'SBO', ordenable: false,
    render: r => r.sbo ? <Link className="texto-codigo enlace" to={`/historial?sbo=${encodeURIComponent(r.sbo)}`} title="Ver todos los movimientos de esta SBO">{r.sbo}</Link> : <span className="texto-suave">—</span>
  },
  {
    id: 'detalles', titulo: 'Detalles', ordenable: false,
    // Los movimientos de un documento (Fase D2) enlazan a su comprobante
    render: r => <span className="texto-suave">
      {r.documento && <><Link className="texto-codigo enlace" to={`/documentos/${r.documento.id}`} title="Ver el comprobante">{r.documento.numero}</Link>{' · '}</>}
      {r.detalles || '—'}
    </span>
  }
]

export default function Historial() {
  const [parametrosUrl, setParametrosUrl] = useSearchParams()
  // Los filtros viven en la URL: los enlaces (desde el inventario o una SBO) abren el historial ya filtrado
  const filtros = Object.fromEntries(Object.keys(FILTROS_VACIOS).map(k => [k, parametrosUrl.get(k) || '']))
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const opcionesFiltro = useLista('/api/historial/filtros').datos || { acciones: [], operarios: [] }

  const { datos, total, error, recargar } = useConsultaPaginada('/api/historial', {
    pagina, porPagina: POR_PAGINA, q: texto.trim(), ...filtros
  })

  const cambiarFiltro = (campo, valor) => {
    const nuevos = new URLSearchParams(parametrosUrl)
    if (valor) nuevos.set(campo, valor)
    else nuevos.delete(campo)
    setParametrosUrl(nuevos, { replace: true })
    setPagina(1)
  }
  const activos = Object.values(filtros).filter(Boolean).length
  const hayFiltros = texto || activos > 0

  return (
    <div>
      <PageHeader icono={History} titulo="Historial de Movimientos" subtitulo="Auditoría de ingresos, salidas, reubicaciones y solicitudes" />

      <ErrorState mensaje={error} onReintentar={recargar} />

      <Card>
        <DataTable
          idTabla="historial-v2"
          columnas={columnas}
          filas={datos}
          porPagina={POR_PAGINA}
          busqueda="Buscar en código, acción, operario o detalle…"
          filtrosActivos={activos}
          onLimpiarFiltros={() => { setParametrosUrl({}, { replace: true }); setPagina(1) }}
          filtros={<>
          <label className="filtro-fecha">Desde <input className="input" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={e => cambiarFiltro('desde', e.target.value)} /></label>
          <label className="filtro-fecha">Hasta <input className="input" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={e => cambiarFiltro('hasta', e.target.value)} /></label>
          <input className="input filtro-texto" placeholder="Código de producto" aria-label="Código de producto" value={filtros.codigo} onChange={e => cambiarFiltro('codigo', e.target.value)} />
          <input className="input filtro-texto" placeholder="Código SBO" aria-label="Código SBO" value={filtros.sbo} onChange={e => cambiarFiltro('sbo', e.target.value)} />
          <select className="select" aria-label="Acción" value={filtros.accion} onChange={e => cambiarFiltro('accion', e.target.value)}>
            <option value="">Todas las acciones</option>
            {opcionesFiltro.acciones.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="select" aria-label="Operario" value={filtros.operario} onChange={e => cambiarFiltro('operario', e.target.value)}>
            <option value="">Todos los operarios</option>
            {opcionesFiltro.operarios.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          </>}
          servidor={{
            total, pagina, onPagina: setPagina,
            orden: { id: 'fecha', dir: 'desc' }, onOrden: () => {},
            texto, onTexto: (t) => { setTexto(t); setPagina(1) }
          }}
          vacio={hayFiltros
            ? { icono: FilterX, titulo: 'Ningún movimiento cumple los filtros', mensaje: 'Pruebe con otro rango de fechas u otros filtros.' }
            : { icono: History, titulo: 'No hay movimientos registrados aún' }}
        />
      </Card>
    </div>
  )
}
