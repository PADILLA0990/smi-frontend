import { Map as MapIcon } from 'lucide-react'

// Placeholder: el diagrama de planta con racks interactivos lo desarrollará otro equipo
export default function InventarioMapa() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', color: 'white' }}>
        <MapIcon size={36} color="#E31837" />
        <h1 style={{ margin: 0 }}>Mapa de Bodega</h1>
      </div>

      <div style={{ backgroundColor: 'white', padding: '60px 30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', textAlign: 'center', color: '#64748b' }}>
        <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#152e52' }}>Módulo en construcción</p>
        <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>Aquí se mostrará el diagrama de planta con los racks interactivos de la bodega.</p>
      </div>
    </div>
  )
}
