import { useState, useEffect } from 'react'

function App() {
  const [productos, setProductos] = useState([])
  const [form, setForm] = useState({
    codigo_producto: '', descripcion: '', categoria: '', cantidad: '', estado: 'Bueno', ubicacion_general: 'Recepción'
  })

  // Función para descargar el inventario (CAMBIO 1)
  const cargarInventario = () => {
    fetch('https://smi-backend-r3ac.onrender.com/api/productos')
      .then(res => res.json())
      .then(data => setProductos(data))
  }

  useEffect(() => { cargarInventario() }, [])

  // Función para enviar un nuevo producto a la base de datos (CAMBIO 2)
  const registrarProducto = async (e) => {
    e.preventDefault()
    await fetch('https://smi-backend-r3ac.onrender.com/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cantidad: parseInt(form.cantidad) })
    })
    cargarInventario() // Recargar la tabla
    setForm({ codigo_producto: '', descripcion: '', categoria: '', cantidad: '', estado: 'Bueno', ubicacion_general: 'Recepción' }) // Limpiar formulario
  }

  // Función para actualizar la estantería (Mover) (CAMBIO 3)
  const moverProducto = async (id) => {
    const nuevaEstanteria = prompt("Ingrese la nueva ubicación o estantería (Ej: Ropa-Bodega2, Pasillo A):")
    if (nuevaEstanteria) {
      await fetch(`https://smi-backend-r3ac.onrender.com/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ubicacion_general: 'Almacenamiento', codigo_estanteria: nuevaEstanteria })
      })
      cargarInventario() // Recargar la tabla para ver el cambio
    }
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'system-ui', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#1a365d', marginBottom: '30px' }}>📦 Panel de Control - Banco de Alimentos</h1>
      
      {/* Panel de Registro */}
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Registrar Nuevo Ingreso (Donaciones)</h2>
        <form onSubmit={registrarProducto} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="Código (Ej: ROP-001)" value={form.codigo_producto} onChange={e => setForm({...form, codigo_producto: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>
          <input placeholder="Descripción (Ej: Cobijas térmicas)" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', flexGrow: 1 }}/>
          <input placeholder="Categoría (Ej: Textiles)" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>
          <input type="number" placeholder="Cantidad" value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100px' }}/>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ Registrar</button>
        </form>
      </div>

      {/* Tabla de Inventario */}
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Inventario Actual</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Código</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Descripción</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Categoría</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Cantidad</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Ubicación</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(prod => (
              <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{prod.codigo_producto}</td>
                <td style={{ padding: '15px' }}>{prod.descripcion}</td>
                <td style={{ padding: '15px' }}>
                  <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '12px', fontSize: '13px' }}>{prod.categoria}</span>
                </td>
                <td style={{ padding: '15px' }}>{prod.cantidad}</td>
                <td style={{ padding: '15px' }}>
                  {prod.ubicacion_general} <br/>
                  <strong style={{ color: '#0f766e', fontSize: '14px' }}>{prod.codigo_estanteria || 'Sin asignar'}</strong>
                </td>
                <td style={{ padding: '15px' }}>
                  <button onClick={() => moverProducto(prod.id)} style={{ padding: '8px 12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Mover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App