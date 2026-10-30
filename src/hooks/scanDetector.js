// Lógica pura (sin React) para distinguir un escáner USB de una persona escribiendo.
// El escáner emula un teclado: envía cada carácter con menos de ~50ms de separación
// y normalmente termina con Enter. Una persona escribe mucho más lento.

const MODIFICADORES = ['Shift', 'CapsLock']

export function createScanDetector({ minLength = 4, maxGapMs = 50 } = {}) {
  let buffer = ''
  let ultimoTiempo = 0

  const reset = () => { buffer = '' }

  // Procesa una tecla. Devuelve el código escaneado cuando se completa una lectura, o null.
  const handleKey = (key, tiempo, { repeat = false } = {}) => {
    // El escáner usa Shift para las mayúsculas: se ignora sin cortar la lectura
    if (MODIFICADORES.includes(key)) return null

    // Mantener una tecla presionada genera repeticiones rápidas que no son un escaneo
    if (repeat) {
      reset()
      return null
    }

    const rapido = tiempo - ultimoTiempo <= maxGapMs

    if (key === 'Enter' || key === 'Tab') {
      const codigo = rapido && buffer.length >= minLength ? buffer : null
      reset()
      return codigo
    }

    // Cualquier otra tecla especial (flechas, borrar, etc.) indica que es una persona
    if (key.length !== 1) {
      reset()
      return null
    }

    // Una pausa larga entre caracteres reinicia la lectura desde este carácter
    buffer = rapido ? buffer + key : key
    ultimoTiempo = tiempo
    return null
  }

  return { handleKey, reset, getBuffer: () => buffer }
}
