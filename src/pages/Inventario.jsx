import { useState, useEffect } from 'react'
import { PackageSearch, Trash2 } from 'lucide-react'

export default function Inventario({ usuarioActual }) {
  const [productos, setProductos] = useState([])

  const cargarInventario = () => {
    fetch('https://smi-backend-r3ac.onrender.com/api/productos')
      .then(res => res.json())
      .then(data => setProductos(data))
  }

  useEffect(() => { cargarInventario() }, [])

  const moverProducto = async (id, codigo_producto) => {
    const nuevaEstanteria = prompt("Ingrese la nueva ubicación o estantería (Ej: Bodega 2, Pasillo A):")
    if (nuevaEstanteria) {
      try {
        // 1. Actualizar inventario (esperamos a que termine)
        await fetch(`https://smi-backend-r3ac.onrender.com/api/productos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ubicacion_general: 'Almacenamiento', codigo_estanteria: nuevaEstanteria })
        });
        
        // 2. Reporte al Historial
        await fetch('https://smi-backend-r3ac.onrender.com/api/historial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo_producto, accion: 'REUBICACIÓN', operario: usuarioActual, detalles: `Movido a: ${nuevaEstanteria}` })
        });
        
        // 3. ¡Ahora sí recargamos la tabla visualmente!
        cargarInventario();
      } catch (error) {
        console.error("Error al mover:", error);
      }
    }
  }

  const eliminarProducto = async (id, codigo_producto) => {
    const confirmar = window.confirm("⚠️ ¿Seguro que quieres eliminar este artículo? Esta acción quedará registrada en el historial.");
    if (confirmar) {
      try {
        // 1. Eliminar del inventario (esperamos a que termine)
        await fetch(`https://smi-backend-r3ac.onrender.com/api/productos/${id}`, { method: 'DELETE' });
        
        // 2. Reporte al Historial
        await fetch('https://smi-backend-r3ac.onrender.com/api/historial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo_producto, accion: 'ELIMINACIÓN', operario: usuarioActual, detalles: 'Artículo retirado del sistema' })
        });
        
        // 3. ¡Ahora sí recargamos la tabla visualmente!
        cargarInventario();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', color: 'white' }}>
        <PackageSearch size={36} color="#E31837" />
        <h1 style={{ margin: 0 }}>Inventario Maestro</h1>
      </div>

      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Código</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Descripción</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Categoría</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Cant.</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Ubicación</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(prod => (
              <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '15px', fontWeight: 'bold', color: '#0f172a' }}>{prod.codigo_producto}</td>
                <td style={{ padding: '15px', color: '#334155' }}>{prod.descripcion}</td>
                <td style={{ padding: '15px' }}>
                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '500' }}>{prod.categoria}</span>
                </td>
                <td style={{ padding: '15px', color: '#334155', fontWeight: '500' }}>{prod.cantidad}</td>
                <td style={{ padding: '15px' }}>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>{prod.ubicacion_general}</div>
                  <strong style={{ color: '#152e52', fontSize: '14px' }}>{prod.codigo_estanteria || 'Sin asignar'}</strong>
                </td>
                <td style={{ padding: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={() => moverProducto(prod.id, prod.codigo_producto)} style={{ padding: '8px 16px', backgroundColor: '#152e52', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                    Reubicar
                  </button>
                  <button onClick={() => eliminarProducto(prod.id, prod.codigo_producto)} style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar Producto">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}