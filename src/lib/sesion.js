// Estado de la sesión fuera de React (lo usa api.js en cada petición).
//
// - El token de acceso (15 min) vive solo en memoria: nunca en localStorage.
// - La renovación usa la cookie httpOnly "smi_sesion", que el JavaScript no puede leer.
// - La marca en sessionStorage hace que la sesión sobreviva a un refresco pero
//   no a cerrar la pestaña: una pestaña nueva no tiene la marca y pide login.
import { API_URL } from './config'

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

// Pide un token nuevo con la cookie. Si varias peticiones lo necesitan a la vez, comparten una sola renovación.
export function renovarSesion() {
  if (!renovacionEnCurso) {
    renovacionEnCurso = fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
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
