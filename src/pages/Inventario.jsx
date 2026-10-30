import { useState, useEffect, useCallback } from 'react'
import { PackageSearch, Trash2 } from 'lucide-react'
import { pedirJSON } from '../api'
import EstadoCarga from '../components/EstadoCarga'

export default function Inventario({ usuarioActual }) {
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState('')

  const cargarInventario = useCallback(() => pedirJSON('/api/productos')
    .then(data => {
      setProductos(data)
      setError('')
    })
    .catch(err => setError(err.message)), [])

  useEffect(() => { cargarInventario() }, [cargarInventario])

  // El backend actualiza el producto y registra el historial en una sola operación
  const moverProducto = async (id) => {
    const nuevaEstanteria = prompt("Ingrese la nueva ubicación o estantería (Ej: Bodega 2, Pasillo A):")
    if (!nuevaEstanteria || !nuevaEstanteria.trim()) return

    try {
      await pedirJSON(`/api/productos/${id}`, {
        method: 'PUT',
        body: { ubicacion_general: 'Almacenamiento', codigo_estanteria: nuevaEstanteria, operario: usuarioActual }
      })
      cargarInventario()
    } catch (err) {
      alert(`❌ Error: ${err.message}`)
    }
  }

  const eliminarProducto = async (id) => {
    const confirmar = window.confirm("⚠️ ¿Seguro que quieres eliminar este artículo? Esta acción quedará registrada en el historial.");
    if (!confirmar) return

    try {
      await pedirJSON(`/api/productos/${id}`, { method: 'DELETE', body: { operario: usuarioActual } })
      cargarInventario()
    } catch (err) {
      alert(`❌ Error: ${err.message}`)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', color: 'white' }}>
        <PackageSearch size={36} color="#E31837" />
        <h1 style={{ margin: 0 }}>Inventario Maestro</h1>
      </div>

      <EstadoCarga cargando={!productos} error={error} onReintentar={() => { setError(''); cargarInventario() }} />

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
            {productos && productos.length === 0 && (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No hay productos en el inventario.</td></tr>
            )}
            {(productos || []).map(prod => (
              <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '15px', fontWeight: 'bold', color: '#0f172a' }}>{prod.codigo_producto}</td>
                <td style={{ padding: '15px', color: '#334155' }}>{prod.descripcion}</td>
                <td style={{ padding: '15px' }}>
                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '500' }}>{prod.categoria}</span>
                </td>
                <td style={{ padding: '15px', color: '#334155', fontWeight: '500' }}>
                  {prod.cantidad}
                  {prod.cantidad_reservada > 0 && (
                    <div style={{ color: '#92400e', fontSize: '12px', fontWeight: 'normal' }} title="Apartadas por Solicitudes SBO aprobadas">
                      {prod.cantidad_reservada} reservadas
                    </div>
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>{prod.ubicacion_general}</div>
                  <strong style={{ color: '#152e52', fontSize: '14px' }}>{prod.codigo_estanteria || 'Sin asignar'}</strong>
                </td>
                <td style={{ padding: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={() => moverProducto(prod.id)} style={{ padding: '8px 16px', backgroundColor: '#152e52', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                    Reubicar
                  </button>
                  <button onClick={() => eliminarProducto(prod.id)} style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar Producto">
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
