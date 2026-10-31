import { useSyncExternalStore } from 'react'

// Estado global de la conexión con el backend, para el aviso "Conectando con el servidor…".
// Render (plan gratuito) duerme el servidor tras un rato sin uso y tarda hasta ~1 minuto en despertar.
let conectando = 0
const suscriptores = new Set()

const avisar = () => suscriptores.forEach(fn => fn())

export function marcarConectando() {
  conectando++
  avisar()
  let terminado = false
  return () => {
    if (terminado) return
    terminado = true
    conectando--
    avisar()
  }
}

export const suscribirConexion = (fn) => {
  suscriptores.add(fn)
  return () => suscriptores.delete(fn)
}

export const estaConectando = () => conectando > 0

// Para pantallas fuera del layout (login, restaurar sesión) que no tienen el aviso global
export const useConectando = () => useSyncExternalStore(suscribirConexion, estaConectando)
