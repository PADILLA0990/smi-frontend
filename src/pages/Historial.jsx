import { useState, useEffect, useCallback } from 'react'
import { History } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import ErrorState from '../components/ui/ErrorState'
import { tonoAccion } from '../lib/tonos'
import { formatearFecha, formatearHora } from '../lib/formato'

const columnas = [
  {
    id: 'fecha', titulo: 'Fecha y hora', valor: r => r.fecha,
    render: r => <span className="texto-suave texto-sm">{formatearFecha(r.fecha)}<br />{formatearHora(r.fecha)}</span>
  },
  { id: 'codigo_producto', titulo: 'Código', render: r => <span className="texto-codigo">{r.codigo_producto}</span> },
  { id: 'accion', titulo: 'Acción', render: r => <Badge tono={tonoAccion(r.accion)}>{r.accion}</Badge> },
  { id: 'operario', titulo: 'Operario' },
  { id: 'detalles', titulo: 'Detalles', render: r => <span className="texto-suave">{r.detalles || '—'}</span> }
]

export default function Historial() {
  const [registros, setRegistros] = useState(null)
  const [error, setError] = useState('')

  const cargarHistorial = useCallback(() => pedirJSON('/api/historial')
    .then(data => {
      setRegistros(data)
      setError('')
    })
    .catch(err => setError(err.message)), [])

  useEffect(() => { cargarHistorial() }, [cargarHistorial])

  return (
    <div>
      <PageHeader icono={History} titulo="Historial de Movimientos" subtitulo="Auditoría de ingresos, salidas, reubicaciones y solicitudes" />

      <ErrorState mensaje={error} onReintentar={() => { setError(''); cargarHistorial() }} />

      <Card>
        <DataTable
          idTabla="historial"
          columnas={columnas}
          filas={error && !registros ? [] : registros}
          busqueda="Buscar por código, acción, operario o detalle…"
          ordenInicial={{ id: 'fecha', dir: 'desc' }}
          porPagina={20}
          vacio={{ icono: History, titulo: 'No hay movimientos registrados aún' }}
        />
      </Card>
    </div>
  )
}
