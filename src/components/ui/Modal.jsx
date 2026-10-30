import { useEffect, useId, useRef } from 'react'

// Ventana modal accesible: Escape cierra, el foco entra al abrir y vuelve al cerrar
export default function Modal({ titulo, icono: Icono, onCerrar, children, acciones }) {
  const idTitulo = useId()
  const caja = useRef(null)

  useEffect(() => {
    const anterior = document.activeElement
    const enfocable = caja.current?.querySelector('input, select, textarea, [data-autofoco]') || caja.current
    enfocable?.focus()
    return () => anterior?.focus?.()
  }, [])

  const alTeclear = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCerrar() }
    // Mantiene el foco dentro de la ventana
    if (e.key === 'Tab') {
      const elementos = [...caja.current.querySelectorAll('button, input, select, textarea, [href]')].filter(el => !el.disabled)
      if (elementos.length === 0) return
      const primero = elementos[0], ultimo = elementos.at(-1)
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
    }
  }

  return (
    <div className="modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={idTitulo} ref={caja} tabIndex={-1} onKeyDown={alTeclear}>
        <h2 id={idTitulo}>{Icono && <Icono size={20} aria-hidden="true" />}{titulo}</h2>
        <div className="modal__cuerpo">{children}</div>
        {acciones && <div className="modal__acciones">{acciones}</div>}
      </div>
    </div>
  )
}
