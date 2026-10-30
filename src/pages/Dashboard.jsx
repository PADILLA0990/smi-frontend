import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { pedirJSON } from '../api';
import EstadoCarga from '../components/EstadoCarga';

// Componente para las tarjetas de resumen
function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: '250px' }}>
      <div style={{ backgroundColor: `${color}15`, padding: '15px', borderRadius: '50%', color: color }}>
        <Icon size={32} />
      </div>
      <div>
        <h3 style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '14px', fontWeight: 'normal' }}>{title}</h3>
        <p style={{ margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: 'bold' }}>{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [estadisticas, setEstadisticas] = useState(null);
  const [error, setError] = useState('');

  const cargarEstadisticas = useCallback(() => pedirJSON('/api/productos')
    // Al cargar el Dashboard, pedimos los productos a la base de datos
    .then(data => {
      setEstadisticas({
        total: data.length,
        enRecepcion: data.filter(p => p.ubicacion_general === 'Recepción').length,
        almacenados: data.filter(p => p.ubicacion_general === 'Almacenamiento').length
      });
      setError('');
    })
    .catch(err => setError(err.message)), []);

  useEffect(() => { cargarEstadisticas() }, [cargarEstadisticas]);

  // Mientras carga se muestra "—" en lugar de un 0 engañoso
  const valor = (campo) => estadisticas ? estadisticas[campo] : '—';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', color: '#152e52' }}>
        <LayoutDashboard size={36} color="#E31837" />
        <h1 style={{ margin: 0 }}>Panel Principal</h1>
      </div>

      <EstadoCarga cargando={!estadisticas} error={error} onReintentar={() => { setError(''); cargarEstadisticas() }} />

      {/* Contenedor de Tarjetas */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <StatCard title="Total Artículos Registrados" value={valor('total')} icon={Package} color="#152e52" />
        <StatCard title="Pendientes de Ubicación" value={valor('enRecepcion')} icon={AlertCircle} color="#E31837" />
        <StatCard title="Ubicados en Estantería" value={valor('almacenados')} icon={CheckCircle2} color="#10b981" />
      </div>
    </div>
  );
}
