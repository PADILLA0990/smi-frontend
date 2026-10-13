import { useState, useEffect } from 'react'
import { History } from 'lucide-react'

export default function Historial() {
  const [registros, setRegistros] = useState([])

  const cargarHistorial = () => {
    fetch('https://smi-backend-r3ac.onrender.com/api/historial')
      .then(res => res.json())
      .then(data => setRegistros(data))
  }

  useEffect(() => { cargarHistorial() }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', color: 'white' }}>
        <History size={36} color="#E31837" />
        <h1 style={{ margin: 0 }}>Historial de Movimientos </h1>
      </div>

      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Fecha y Hora</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Código</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Acción</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Operario</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No hay movimientos registrados aún.</td></tr>
            ) : (
              registros.map(reg => (
                <tr key={reg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px', color: '#64748b', fontSize: '13px' }}>
                    {new Date(reg.fecha).toLocaleString()}
                  </td>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#152e52' }}>{reg.codigo_producto}</td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ 
                      backgroundColor: reg.accion === 'INGRESO NUEVO' ? '#dcfce7' : reg.accion === 'ELIMINACIÓN' ? '#fee2e2' : '#e0f2fe', 
                      color: reg.accion === 'INGRESO NUEVO' ? '#166534' : reg.accion === 'ELIMINACIÓN' ? '#991b1b' : '#075985', 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' 
                    }}>
                      {reg.accion}
                    </span>
                  </td>
                  <td style={{ padding: '15px', color: '#334155', fontWeight: '500' }}>{reg.operario}</td>
                  <td style={{ padding: '15px', color: '#475569', fontSize: '14px' }}>{reg.detalles}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}