import { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, Package, AlertCircle, CheckCircle2 } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import ErrorState from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { formatearNumero } from '../lib/formato'

// Tarjeta de indicador
function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="card kpi">
      <div className="kpi__icono" style={{ backgroundColor: `${color}1a`, color }} aria-hidden="true">
        <Icon size={28} />
      </div>
      <div>
        <h2 className="kpi__titulo">{title}</h2>
        <p className="kpi__valor">{value === null ? <Skeleton ancho={60} alto={26} /> : formatearNumero(value)}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [estadisticas, setEstadisticas] = useState(null)
  const [error, setError] = useState('')

  const cargarEstadisticas = useCallback(() => pedirJSON('/api/productos')
    .then(data => {
      setEstadisticas({
        total: data.length,
        enRecepcion: data.filter(p => p.ubicacion_general === 'Recepción').length,
        almacenados: data.filter(p => p.ubicacion_general === 'Almacenamiento').length
      })
      setError('')
    })
    .catch(err => setError(err.message)), [])

  useEffect(() => { cargarEstadisticas() }, [cargarEstadisticas])

  // null mientras carga: la tarjeta muestra un bloque animado en lugar de un 0 engañoso
  const valor = (campo) => estadisticas ? estadisticas[campo] : null

  return (
    <div>
      <PageHeader icono={LayoutDashboard} titulo="Panel Principal" subtitulo="Resumen del inventario de la bodega" />

      <ErrorState mensaje={error} onReintentar={() => { setError(''); cargarEstadisticas() }} />

      <div className="kpis">
        <StatCard title="Total artículos registrados" value={valor('total')} icon={Package} color="#152e52" />
        <StatCard title="Pendientes de ubicación" value={valor('enRecepcion')} icon={AlertCircle} color="#b91c1c" />
        <StatCard title="Ubicados en estantería" value={valor('almacenados')} icon={CheckCircle2} color="#047857" />
      </div>
    </div>
  )
}
