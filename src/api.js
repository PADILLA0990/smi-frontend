import { marcarConectando } from './lib/conexion'
import { API_URL } from './lib/config'
import { obtenerToken, renovarSesion, sesionExpirada } from './lib/sesion'

export { API_URL }

// Si una petición tarda más que esto, se muestra "Conectando con el servidor…"
const MS_AVISO_LENTO = 3000
// Las consultas (GET) se reintentan solas mientras el servidor despierta; las escrituras no,
// para no registrar dos veces un mismo movimiento.
const ESPERAS_REINTENTO_MS = [2000, 4000, 8000, 15000, 30000]
const CODIGOS_SERVIDOR_DORMIDO = [502, 503, 504]
// Respuestas 401 que se arreglan renovando el token con la cookie de sesión
const CODIGOS_RENOVABLES = ['TOKEN_VENCIDO', 'TOKEN_INVALIDO', 'SIN_SESION']

const esperar = (ms) => new Promise(r => setTimeout(r, ms))

// Error con el código HTTP y el código de negocio que envía el backend (p. ej. USUARIO_BLOQUEADO)
export class ErrorApi extends Error {
  constructor(mensaje, status, codigo) {
    super(mensaje)
    this.status = status
    this.codigo = codigo
  }
}

// Llama a la API y devuelve el JSON. Si el servidor responde con error o no hay conexión,
// lanza un ErrorApi con un mensaje listo para mostrar al usuario.
// Envía el token de acceso y, si venció, lo renueva una vez y reintenta.
export async function pedirJSON(ruta, { method = 'GET', body, sinSesion = false } = {}) {
  const reintentable = method === 'GET'
  let terminarAviso = null
  let renovado = false
  const temporizador = setTimeout(() => { terminarAviso = marcarConectando() }, MS_AVISO_LENTO)

  try {
    for (let intento = 0; ; intento++) {
      const token = sinSesion ? null : obtenerToken()
      let response
      try {
        response = await fetch(`${API_URL}${ruta}`, {
          method,
          credentials: 'include',
          headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: body ? JSON.stringify(body) : undefined
        })
      } catch {
        if (reintentable && intento < ESPERAS_REINTENTO_MS.length) {
          terminarAviso ??= marcarConectando()
          await esperar(ESPERAS_REINTENTO_MS[intento])
          continue
        }
        throw new ErrorApi('No hay conexión con el servidor. Revise su internet e intente de nuevo.', 0)
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

      if (response.status === 401 && !sinSesion && CODIGOS_RENOVABLES.includes(data?.codigo)) {
        if (!renovado) {
          renovado = true
          try {
            await renovarSesion()
            intento--
            continue
          } catch {
            // No se pudo renovar: la sesión terminó
          }
        }
        sesionExpirada()
      } else if (response.status === 401 && data?.codigo === 'USUARIO_INACTIVO') {
        sesionExpirada()
      }

      if (!response.ok) {
        throw new ErrorApi(data?.error || `El servidor respondió con un error (${response.status}).`, response.status, data?.codigo)
      }
      return data
    }
  } finally {
    clearTimeout(temporizador)
    terminarAviso?.()
  }
}
