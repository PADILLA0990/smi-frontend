import { AlertCircle, Loader2 } from 'lucide-react'

// Muestra "Cargando..." o el error con un botón para reintentar.
// Devuelve null cuando no hay nada que mostrar, así la página sigue normal.
export default function EstadoCarga({ cargando, error, onReintentar }) {
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
        <AlertCircle size={20} style={{ minWidth: '20px' }} />
        <span style={{ flexGrow: 1 }}>{error}</span>
        {onReintentar && (
          <button onClick={onReintentar} style={{ padding: '8px 16px', backgroundColor: '#991b1b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Reintentar
          </button>
        )}
      </div>
    )
  }

  if (cargando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', marginBottom: '20px', fontSize: '14px' }}>
        <Loader2 size={18} className="girando" />
        <span>Cargando datos... (si el servidor estaba inactivo puede tardar hasta un minuto)</span>
      </div>
    )
  }

  return null
}
