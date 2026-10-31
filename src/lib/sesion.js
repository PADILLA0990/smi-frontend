// Estado de la sesión fuera de React (lo usa api.js en cada petición).
//
// - El token de acceso (15 min) vive solo en memoria: nunca en localStorage.
// - La renovación usa la cookie httpOnly "smi_sesion", que el JavaScript no puede leer.
// - La marca en sessionStorage hace que la sesión sobreviva a un refresco pero
//   no a cerrar la pestaña: una pestaña nueva no tiene la marca y pide login.
import { API_URL } from './config'
import { marcarConectando } from './conexion'

const MARCA = 'smi-sesion-activa'
let tokenAcceso = null
let renovacionEnCurso = null
const alExpirar = new Set()

export const obtenerToken = () => tokenAcceso

export function guardarSesion(token) {
  tokenAcceso = token
  try { sessionStorage.setItem(MARCA, '1') } catch { /* sin almacenamiento */ }
}

export function borrarSesion() {
  tokenAcceso = null
  try { sessionStorage.removeItem(MARCA) } catch { /* sin almacenamiento */ }
}

export function haySesionEnPestana() {
  try { return sessionStorage.getItem(MARCA) === '1' } catch { return false }
}

// Render (plan gratuito) duerme el servidor y tarda hasta ~1 minuto en despertar; mientras tanto el proxy de
// Vercel puede responder 502/503/504. Antes del login o de renovar la sesión se espera con una consulta
// inofensiva (GET /api/auth/yo sin token: responde 401 sin tocar la base) que sí se puede repetir.
// Así el login y la renovación se envían una sola vez: repetir una renovación usaría una cookie ya rotada
// y el backend lo trataría como robo de sesión.
// Se pregunta cada 3 s (la consulta es liviana) hasta ~90 s, para entrar apenas el servidor despierte
const ESPERAS_DESPERTAR_MS = [1000, 2000, ...Array(29).fill(3000)]
let despertando = null

export function despertarServidor() {
  if (!despertando) {
    despertando = (async () => {
      let terminarAviso = null
      const temporizador = setTimeout(() => { terminarAviso = marcarConectando() }, 1500)
      try {
        for (let intento = 0; ; intento++) {
          try {
            const r = await fetch(`${API_URL}/api/auth/yo`, { credentials: 'omit' })
            if (![502, 503, 504].includes(r.status)) return
          } catch { /* sin respuesta todavía */ }
          if (intento >= ESPERAS_DESPERTAR_MS.length) return // se intenta igual; el error real lo mostrará la petición
          terminarAviso ??= marcarConectando()
          await new Promise(res => setTimeout(res, ESPERAS_DESPERTAR_MS[intento]))
        }
      } finally {
        clearTimeout(temporizador)
        terminarAviso?.()
        despertando = null
      }
    })()
  }
  return despertando
}

// Pide un token nuevo con la cookie. Si varias peticiones lo necesitan a la vez, comparten una sola renovación.
export function renovarSesion() {
  if (!renovacionEnCurso) {
    renovacionEnCurso = despertarServidor()
      .then(() => fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' }))
      .then(async (r) => {
        const data = await r.json().catch(() => null)
        if (!r.ok) throw new Error(data?.error || 'La sesión expiró. Inicie sesión de nuevo.')
        guardarSesion(data.accessToken)
        return data
      })
      .finally(() => { renovacionEnCurso = null })
  }
  return renovacionEnCurso
}

// Aviso para que la app vuelva al login cuando la sesión ya no se puede renovar
export const suscribirExpiracion = (fn) => {
  alExpirar.add(fn)
  return () => alExpirar.delete(fn)
}

export function sesionExpirada() {
  borrarSesion()
  alExpirar.forEach(fn => fn())
}
