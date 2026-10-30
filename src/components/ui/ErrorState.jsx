import { AlertCircle, RotateCw } from 'lucide-react'

// Error al cargar datos, con botón "Reintentar"
export default function ErrorState({ mensaje, onReintentar }) {
  if (!mensaje) return null
  return (
    <div className="estado-error" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <span>{mensaje}</span>
      {onReintentar && (
        <button className="btn btn--peligro btn--sm" onClick={onReintentar}>
          <RotateCw size={14} aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  )
}
