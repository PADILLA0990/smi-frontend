import { useCallback, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { DialogosContexto } from '../../lib/dialogos'
import ConfirmModal from './ConfirmModal'

const ICONOS_TOAST = { exito: CheckCircle2, error: AlertCircle, info: Info }
const DURACION_TOAST_MS = { exito: 5000, info: 5000, error: 9000 }

export default function DialogosProvider({ children }) {
  const [confirmacion, setConfirmacion] = useState(null)
  const [toasts, setToasts] = useState([])
  const siguienteId = useRef(1)

  const confirmar = useCallback((opciones) => new Promise(resolver => {
    setConfirmacion({ ...opciones, resolver })
  }), [])

  const cerrarToast = useCallback((id) => setToasts(lista => lista.filter(t => t.id !== id)), [])

  const avisar = useCallback((mensaje, tipo = 'exito') => {
    const id = siguienteId.current++
    setToasts(lista => [...lista.slice(-3), { id, mensaje, tipo }])
    setTimeout(() => cerrarToast(id), DURACION_TOAST_MS[tipo] || 5000)
  }, [cerrarToast])

  const valor = useMemo(() => ({ confirmar, avisar }), [confirmar, avisar])

  const responder = (respuesta) => {
    confirmacion.resolver(respuesta)
    setConfirmacion(null)
  }

  return (
    <DialogosContexto.Provider value={valor}>
      {children}

      {confirmacion && (
        <ConfirmModal
          {...confirmacion}
          onConfirmar={responder}
          onCancelar={() => responder(confirmacion.campo ? null : false)}
        />
      )}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => {
          const Icono = ICONOS_TOAST[t.tipo] || Info
          return (
            <div key={t.id} className={`toast toast--${t.tipo}`} role={t.tipo === 'error' ? 'alert' : undefined}>
              <Icono size={20} aria-hidden="true" />
              <span>{t.mensaje}</span>
              <button className="btn btn--fantasma" onClick={() => cerrarToast(t.id)} aria-label="Cerrar aviso"><X size={16} /></button>
            </div>
          )
        })}
      </div>
    </DialogosContexto.Provider>
  )
}
