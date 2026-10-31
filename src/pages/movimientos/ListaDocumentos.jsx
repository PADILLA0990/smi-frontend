import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, FilterX } from 'lucide-react'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import ErrorState from '../../components/ui/ErrorState'
import { useConsultaPaginada } from '../../lib/paginado'
import { formatearFecha, formatearHora, formatearNumero } from '../../lib/formato'
import { ORIGENES } from '../../lib/documentos'

const POR_PAGINA = 25
const FILTROS_VACIOS = { tipo: '', desde: '', hasta: '' }

const columnas = [
  {
    id: 'numero', titulo: 'Número', ordenable: false, fija: true,
    render: d => <Link className="texto-codigo enlace" to={`/documentos/${d.id}`} onClick={e => e.stopPropagation()}>{d.numero}</Link>
  },
  { id: 'fecha', titulo: 'Fecha y hora', ordenable: false, render: d => <span className="texto-suave texto-sm">{formatearFecha(d.fecha)}<br />{formatearHora(d.fecha)}</span> },
  { id: 'tipo', titulo: 'Tipo', ordenable: false, render: d => <Badge tono={d.tipo === 'INGRESO' ? 'verde' : 'naranja'}>{d.tipo === 'INGRESO' ? 'Ingreso' : 'Salida'}</Badge> },
  { id: 'concepto', titulo: 'Origen / motivo', ordenable: false, render: d => (d.tipo === 'INGRESO' ? ORIGENES[d.origen] : d.motivo_nombre) },
  { id: 'tercero', titulo: 'Donante / destino', ordenable: false, render: d => d.tercero_nombre || d.organizacion_nombre || <span className="texto-suave">—</span> },
  { id: 'soporte', titulo: 'Soporte', ordenable: false, render: d => d.soporte || <span className="texto-suave">—</span> },
  { id: 'lineas', titulo: 'Líneas', alinear: 'num', ordenable: false, render: d => formatearNumero(d.lineas) },
  { id: 'unidades', titulo: 'Unidades', alinear: 'num', ordenable: false, render: d => <strong>{formatearNumero(d.unidades)}</strong> },
  { id: 'operario', titulo: 'Registró', ordenable: false }
]

export default function ListaDocumentos() {
  const navegar = useNavigate()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const { datos, total, error, recargar } = useConsultaPaginada('/api/documentos', { pagina, porPagina: POR_PAGINA, q: texto.trim(), ...filtros })

  const cambiar = (campo, valor) => { setFiltros(f => ({ ...f, [campo]: valor })); setPagina(1) }
  const hayFiltros = texto || Object.values(filtros).some(Boolean)

  return (
    <Card titulo="Documentos registrados" icono={FileText} subtitulo="Haga clic en un documento para ver su comprobante e imprimirlo.">
      <ErrorState mensaje={error} onReintentar={recargar} />
      <div className="filtros">
        <select className="select" aria-label="Tipo de documento" value={filtros.tipo} onChange={e => cambiar('tipo', e.target.value)}>
          <option value="">Ingresos y salidas</option>
          <option value="INGRESO">Solo ingresos</option>
          <option value="SALIDA">Solo salidas</option>
        </select>
        <label className="filtro-fecha">Desde <input className="input" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={e => cambiar('desde', e.target.value)} /></label>
        <label className="filtro-fecha">Hasta <input className="input" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={e => cambiar('hasta', e.target.value)} /></label>
        {hayFiltros && (
          <button type="button" className="btn btn--secundario btn--sm" onClick={() => { setFiltros(FILTROS_VACIOS); setTexto(''); setPagina(1) }}>
            <FilterX size={14} aria-hidden="true" /> Limpiar
          </button>
        )}
      </div>
      <DataTable
        idTabla="documentos"
        columnas={columnas}
        filas={datos}
        porPagina={POR_PAGINA}
        busqueda="Buscar por número, donante, organización, soporte o código de producto…"
        onFilaClick={d => navegar(`/documentos/${d.id}`)}
        servidor={{
          total, pagina, onPagina: setPagina,
          orden: { id: 'fecha', dir: 'desc' }, onOrden: () => {},
          texto, onTexto: (t) => { setTexto(t); setPagina(1) }
        }}
        vacio={hayFiltros
          ? { icono: FilterX, titulo: 'Ningún documento cumple los filtros' }
          : { icono: FileText, titulo: 'Aún no hay documentos', mensaje: 'Los ingresos y salidas que registre aparecerán aquí.' }}
      />
    </Card>
  )
}
