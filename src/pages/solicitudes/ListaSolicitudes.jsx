import { useState } from 'react'
import { ClipboardList, FilterX } from 'lucide-react'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import ErrorState from '../../components/ui/ErrorState'
import { useLista } from '../../lib/catalogos'
import { ETIQUETA_ESTADO_SBO } from '../../lib/tonos'
import { formatearFecha, formatearFechaCalendario, formatearNumero } from '../../lib/formato'
import { ESTADOS_SBO, FILTROS_SBO_VACIOS, textoVencimiento } from '../../lib/solicitudes'
import { BadgeEstado } from './DetalleSolicitud'

const POR_PAGINA = 20

const columnas = [
  { id: 'codigo_sbo', titulo: 'SBO', fija: true, ordenable: false, render: s => <span className="texto-codigo">{s.codigo_sbo}</span> },
  { id: 'beneficiario', titulo: 'Organización', ordenable: false },
  {
    id: 'estado', titulo: 'Estado', ordenable: false,
    render: s => <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      <BadgeEstado estado={s.estado} />
      {s.atrasada && <Badge tono="rojo">Atrasada</Badge>}
      {s.por_vencer && <Badge tono="naranja">{textoVencimiento(s)}</Badge>}
    </span>
  },
  { id: 'items', titulo: 'Líneas', alinear: 'num', ordenable: false, render: s => formatearNumero(s.items.length) },
  { id: 'unidades', titulo: 'Unidades', alinear: 'num', ordenable: false, render: s => formatearNumero(s.unidades_solicitadas) },
  { id: 'alistador', titulo: 'Alistador', ordenable: false, render: s => s.alistador || <span className="texto-suave">—</span> },
  { id: 'fecha_requerida', titulo: 'Requerida', ordenable: false, render: s => s.fecha_requerida ? formatearFechaCalendario(s.fecha_requerida) : <span className="texto-suave">—</span> },
  { id: 'fecha_solicitud', titulo: 'Creada', ordenable: false, render: s => <span className="texto-suave texto-sm">{formatearFecha(s.fecha_solicitud)}</span> }
]

// Lista paginada en el servidor con filtros por estado, organización, alistador, fechas, atrasadas y por vencer
export default function ListaSolicitudes({ datos, total, resumen, error, recargar, filtros, setFiltros, texto, setTexto, pagina, setPagina, alistadores, onAbrir, activa }) {
  const organizaciones = useLista('/api/catalogos/organizaciones').datos || []
  const cambiar = (campo, valor) => { setFiltros(f => ({ ...f, [campo]: valor })); setPagina(1) }
  const hayFiltros = texto || Object.values(filtros).some(Boolean)
  const [verFechas, setVerFechas] = useState(false)

  return (
    <Card titulo="Solicitudes" icono={ClipboardList}
      subtitulo={resumen && (resumen.atrasadas || resumen.por_vencer)
        ? `${formatearNumero(resumen.atrasadas)} atrasada(s) y ${formatearNumero(resumen.por_vencer)} por vencer en esta búsqueda.`
        : 'Haga clic en una solicitud para ver su detalle.'}>
      <ErrorState mensaje={error} onReintentar={recargar} />
      <div className="filtros">
        <select className="select" aria-label="Estado" value={filtros.estado} onChange={e => cambiar('estado', e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ACTIVAS">En curso (sin despachar)</option>
          {ESTADOS_SBO.map(est => <option key={est} value={est}>{ETIQUETA_ESTADO_SBO[est]}</option>)}
        </select>
        <select className="select" aria-label="Organización" value={filtros.organizacionId} onChange={e => cambiar('organizacionId', e.target.value)}>
          <option value="">Todas las organizaciones</option>
          {organizaciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <select className="select" aria-label="Alistador" value={filtros.alistador} onChange={e => cambiar('alistador', e.target.value)}>
          <option value="">Todos los alistadores</option>
          {alistadores.map(a => <option key={a.usuario} value={a.usuario}>{a.nombre}</option>)}
        </select>
        <label className="filtro-check"><input type="checkbox" checked={filtros.atrasada} onChange={e => cambiar('atrasada', e.target.checked)} /> Atrasadas</label>
        <label className="filtro-check"><input type="checkbox" checked={filtros.porVencer} onChange={e => cambiar('porVencer', e.target.checked)} /> Por vencer</label>
        {(verFechas || filtros.desde || filtros.hasta) ? <>
          <label className="filtro-fecha">Desde <input className="input" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={e => cambiar('desde', e.target.value)} /></label>
          <label className="filtro-fecha">Hasta <input className="input" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={e => cambiar('hasta', e.target.value)} /></label>
        </> : <button type="button" className="btn btn--fantasma btn--sm" onClick={() => setVerFechas(true)}>Filtrar por fecha de creación</button>}
        {hayFiltros && (
          <button type="button" className="btn btn--secundario btn--sm" onClick={() => { setFiltros(FILTROS_SBO_VACIOS); setTexto(''); setPagina(1); setVerFechas(false) }}>
            <FilterX size={14} aria-hidden="true" /> Limpiar
          </button>
        )}
      </div>
      <DataTable
        idTabla="solicitudes-v2"
        columnas={columnas}
        filas={datos}
        porPagina={POR_PAGINA}
        busqueda="Buscar por SBO, organización o producto…"
        onFilaClick={s => onAbrir(s.id)}
        filaActiva={activa}
        servidor={{
          total, pagina, onPagina: setPagina,
          orden: { id: 'fecha_solicitud', dir: 'desc' }, onOrden: () => {},
          texto, onTexto: (t) => { setTexto(t); setPagina(1) }
        }}
        vacio={hayFiltros
          ? { icono: FilterX, titulo: 'Ninguna solicitud cumple los filtros' }
          : { icono: ClipboardList, titulo: 'No hay solicitudes registradas', mensaje: 'Las solicitudes que se creen aparecerán aquí.' }}
      />
    </Card>
  )
}
