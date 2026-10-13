import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'

export default function Movimientos({ usuarioActual }) {
  // Estado para el formulario de Ingreso
  const [formIngreso, setFormIngreso] = useState({
    codigo_producto: '', descripcion: '', categoria: '', cantidad: '', estado: 'Bueno', ubicacion_general: 'Recepción'
  })

  // Estado para el formulario de Salida
  const [formSalida, setFormSalida] = useState({
    codigo_producto: '', motivo: '', cantidad: ''
  })

  const registrarIngreso = async (e) => {
    e.preventDefault()
    
    // 1. Guardar en inventario
    await fetch('https://smi-backend-r3ac.onrender.com/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formIngreso, cantidad: parseInt(formIngreso.cantidad) })
    })

    // 2. Reporte al Historial
    await fetch('https://smi-backend-r3ac.onrender.com/api/historial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo_producto: formIngreso.codigo_producto,
        accion: 'INGRESO NUEVO',
        operario: usuarioActual,
        detalles: `Ingresó cantidad: ${formIngreso.cantidad}`
      })
    })
    
    alert(`¡Ingreso registrado exitosamente por ${usuarioActual}!`)
    setFormIngreso({ codigo_producto: '', descripcion: '', categoria: '', cantidad: '', estado: 'Bueno', ubicacion_general: 'Recepción' })
  }

  const registrarSalida = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('https://smi-backend-r3ac.onrender.com/api/salida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_producto: formSalida.codigo_producto,
          cantidad_retirada: parseInt(formSalida.cantidad),
          motivo: formSalida.motivo,
          operario: usuarioActual
        })
      });

      const data = await response.json();

      // Si el backend detecta un error (no existe o no hay stock), mostramos la alerta
      if (!response.ok) {
        alert(`❌ Error: ${data.error}`);
        return;
      }
      
      // Si todo sale bien
      alert(`✅ ¡Salida registrada exitosamente por ${usuarioActual}!`);
      setFormSalida({ codigo_producto: '', motivo: '', cantidad: '' });

    } catch (error) {
      alert("❌ Error de conexión con el servidor.");
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', color: 'white' }}>
        <ArrowRightLeft size={36} color="#E31837" />
        <h1 style={{ margin: 0 }}>Gestión de Ingresos y Retiros</h1>
      </div>
      
      {/* SECCIÓN DE INGRESOS */}
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', marginBottom: '30px' }}>
        <h2 style={{ marginTop: 0, color: '#152e52', fontSize: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }}>
          📥 Registrar Nuevo Ingreso (Donaciones)
        </h2>
        
        <form onSubmit={registrarIngreso} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 1 }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Código / Referencia</label>
            <input placeholder="Ej: ROP-001" value={formIngreso.codigo_producto} onChange={e => setFormIngreso({...formIngreso, codigo_producto: e.target.value})} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 2 }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Descripción del Artículo</label>
            <input placeholder="Ej: Cobijas térmicas donadas" value={formIngreso.descripcion} onChange={e => setFormIngreso({...formIngreso, descripcion: e.target.value})} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 1 }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Categoría</label>
            <input placeholder="Ej: Textiles" value={formIngreso.categoria} onChange={e => setFormIngreso({...formIngreso, categoria: e.target.value})} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '120px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Cantidad</label>
            <input type="number" placeholder="0" value={formIngreso.cantidad} onChange={e => setFormIngreso({...formIngreso, cantidad: e.target.value})} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>
          </div>
          
          <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '43px' }}>
            Registrar Ingreso
          </button>
        </form>
      </div>

      {/* SECCIÓN DE SALIDAS */}
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginTop: 0, color: '#152e52', fontSize: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }}>
          📤 Registrar Salida / Retiro
        </h2>
        
        <form onSubmit={registrarSalida} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 1 }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Código del Producto a Retirar</label>
            <input placeholder="Ej: ROP-001" value={formSalida.codigo_producto} onChange={e => setFormSalida({...formSalida, codigo_producto: e.target.value})} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 2 }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Motivo de la Salida / Destino</label>
            <input placeholder="Ej: Entrega a Fundación XYZ" value={formSalida.motivo} onChange={e => setFormSalida({...formSalida, motivo: e.target.value})} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '120px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Cantidad</label>
            <input type="number" placeholder="0" value={formSalida.cantidad} onChange={e => setFormSalida({...formSalida, cantidad: e.target.value})} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}/>
          </div>
          
          <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#E31837', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '43px' }}>
            Registrar Salida
          </button>
        </form>
      </div>

    </div>
  )
}