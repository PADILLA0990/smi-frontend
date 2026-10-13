import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    enRecepcion: 0,
    almacenados: 0
  });

  useEffect(() => {
    // Al cargar el Dashboard, pedimos los productos a la base de datos
    fetch('https://smi-backend-r3ac.onrender.com/api/productos')
      .then(res => res.json())
      .then(data => {
        // Calculamos las estadísticas
        const totalProductos = data.length;
        const enRecepcion = data.filter(p => p.ubicacion_general === 'Recepción').length;
        const almacenados = data.filter(p => p.ubicacion_general === 'Almacenamiento').length;

        setEstadisticas({
          total: totalProductos,
          enRecepcion: enRecepcion,
          almacenados: almacenados
        });
      });
  }, []);

  // Componente para las tarjetas de resumen
  const StatCard = ({ title, value, icon: Icon, color }) => (
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', color: '#152e52' }}>
        <LayoutDashboard size={36} color="#E31837" />
        <h1 style={{ margin: 0 }}>Panel Principal</h1>
      </div>

      {/* Contenedor de Tarjetas */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <StatCard title="Total Artículos Registrados" value={estadisticas.total} icon={Package} color="#152e52" />
        <StatCard title="Pendientes de Ubicación" value={estadisticas.enRecepcion} icon={AlertCircle} color="#E31837" />
        <StatCard title="Ubicados en Estantería" value={estadisticas.almacenados} icon={CheckCircle2} color="#10b981" />
      </div>
    </div>
  );
}