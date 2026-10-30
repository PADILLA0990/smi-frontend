import { marcarConectando } from './lib/conexion'

// URL del backend. En local se puede sobreescribir con VITE_API_URL en un archivo .env
export const API_URL = import.meta.env.VITE_API_URL || 'https://smi-backend-r3ac.onrender.com'

// Si una petición tarda más que esto, se muestra "Conectando con el servidor…"
const MS_AVISO_LENTO = 3000
// Las consultas (GET) se reintentan solas mientras el servidor despierta; las escrituras no,
// para no registrar dos veces un mismo movimiento.
const ESPERAS_REINTENTO_MS = [2000, 4000, 8000, 15000, 30000]
const CODIGOS_SERVIDOR_DORMIDO = [502, 503, 504]

const esperar = (ms) => new Promise(r => setTimeout(r, ms))

// Llama a la API y devuelve el JSON. Si el servidor responde con error o no hay conexión,
// lanza un Error con un mensaje listo para mostrar al usuario.
export async function pedirJSON(ruta, { method = 'GET', body } = {}) {
  const reintentable = method === 'GET'
  let terminarAviso = null
  const temporizador = setTimeout(() => { terminarAviso = marcarConectando() }, MS_AVISO_LENTO)

  try {
    for (let intento = 0; ; intento++) {
      let response
      try {
        response = await fetch(`${API_URL}${ruta}`, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined
        })
      } catch {
        if (reintentable && intento < ESPERAS_REINTENTO_MS.length) {
          terminarAviso ??= marcarConectando()
          await esperar(ESPERAS_REINTENTO_MS[intento])
          continue
        }
        throw new Error('No hay conexión con el servidor. Revise su internet e intente de nuevo.')
      }

      if (reintentable && CODIGOS_SERVIDOR_DORMIDO.includes(response.status) && intento < ESPERAS_REINTENTO_MS.length) {
        terminarAviso ??= marcarConectando()
        await esperar(ESPERAS_REINTENTO_MS[intento])
        continue
      }

      let data = null
      try {
        data = await response.json()
      } catch {
        // Respuesta sin JSON: se maneja abajo según el código HTTP
      }

      if (!response.ok) {
        throw new Error(data?.error || `El servidor respondió con un error (${response.status}).`)
      }
      return data
    }
  } finally {
    clearTimeout(temporizador)
    terminarAviso?.()
  }
}
