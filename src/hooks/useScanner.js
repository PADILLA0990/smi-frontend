import { useEffect, useRef } from 'react'
import { createScanDetector } from './scanDetector'

// Quita el código escaneado del campo donde estaba el cursor (el escáner también "escribe" ahí).
// Usa el setter nativo para que React detecte el cambio en inputs controlados.
function quitarDelCampo(elemento, codigo) {
  const esCampo = elemento instanceof HTMLInputElement || elemento instanceof HTMLTextAreaElement
  if (!esCampo || !elemento.value.endsWith(codigo)) return

  const prototipo = elemento instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototipo, 'value').set
  setter.call(elemento, elemento.value.slice(0, -codigo.length))
  elemento.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Detecta lecturas de un escáner de códigos de barras USB (emulación de teclado).
 *
 * @param {(codigo: string) => void} onScan  Se llama con el código leído
 * @param {object}  opciones
 * @param {boolean} opciones.enabled     Activa/desactiva la escucha (por defecto true)
 * @param {number}  opciones.minLength   Largo mínimo del código (por defecto 4)
 * @param {number}  opciones.maxGapMs    Tiempo máximo entre caracteres del escáner (por defecto 50ms)
 */
export default function useScanner(onScan, { enabled = true, minLength = 4, maxGapMs = 50 } = {}) {
  // Se guarda en una ref para no re-suscribir el listener en cada render
  const onScanRef = useRef(onScan)
  useEffect(() => { onScanRef.current = onScan })

  useEffect(() => {
    if (!enabled) return

    const detector = createScanDetector({ minLength, maxGapMs })

    const manejarTecla = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) {
        detector.reset()
        return
      }

      const codigo = detector.handleKey(e.key, e.timeStamp, { repeat: e.repeat })
      if (!codigo) return

      // Evita que el Enter del escáner envíe el formulario a medio llenar
      e.preventDefault()
      e.stopPropagation()
      quitarDelCampo(e.target, codigo)
      onScanRef.current(codigo)
    }

    // Fase de captura: se procesa antes que los handlers de React y del formulario
    window.addEventListener('keydown', manejarTecla, true)
    return () => window.removeEventListener('keydown', manejarTecla, true)
  }, [enabled, minLength, maxGapMs])
}
