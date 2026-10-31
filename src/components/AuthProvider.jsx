import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { pedirJSON } from '../api'
import { AuthContexto } from '../lib/auth'
import { useConectando } from '../lib/conexion'
import { guardarSesion, borrarSesion, haySesionEnPestana, renovarSesion, suscribirExpiracion, despertarServidor } from '../lib/sesion'
import logoBab from '../assets/logo-bab.png'

// En la pantalla de carga, explica la espera si el servidor está despertando
function AvisoDespertando() {
  return useConectando() ? <p style={{ marginTop: 6 }}>El servidor está despertando; puede tardar hasta un minuto.</p> : null
}

// Restaura la sesión al refrescar (con la cookie) y expone login, logout y cambio de contraseña
export default function AuthProvider({ children }) {
  // 'cargando' solo si esta pestaña tenía sesión: hay que renovarla antes de mostrar nada
  const [estado, setEstado] = useState(() => (haySesionEnPestana() ? 'cargando' : 'anonimo'))
  const [usuario, setUsuario] = useState(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (estado !== 'cargando') return
    renovarSesion()
      .then(data => { setUsuario(data.usuario); setEstado('autenticado') })
      .catch(() => { borrarSesion(); setEstado('anonimo') })
  }, [estado])

  // Si una petición descubre que la sesión ya no es válida, se vuelve al login
  useEffect(() => suscribirExpiracion(() => {
    setUsuario(null)
    setEstado('anonimo')
    setAviso('Su sesión terminó. Inicie sesión de nuevo.')
  }), [])

  const iniciarSesion = useCallback(async (nombreUsuario, password) => {
    // Primero se espera a que el servidor despierte; el login se envía una sola vez
    await despertarServidor()
    const data = await pedirJSON('/api/auth/login', { method: 'POST', body: { usuario: nombreUsuario, password }, sinSesion: true })
    guardarSesion(data.accessToken)
    setUsuario(data.usuario)
    setAviso('')
    setEstado('autenticado')
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await pedirJSON('/api/auth/logout', { method: 'POST', sinSesion: true })
    } catch {
      // Aunque el servidor no responda, la sesión local se cierra
    }
    borrarSesion()
    setUsuario(null)
    setEstado('anonimo')
  }, [])

  const cambiarPassword = useCallback(async (actual, nueva) => {
    const data = await pedirJSON('/api/auth/cambiar-password', { method: 'POST', body: { actual, nueva } })
    guardarSesion(data.accessToken)
    setUsuario(data.usuario)
  }, [])

  const valor = useMemo(() => ({ usuario, aviso, iniciarSesion, cerrarSesion, cambiarPassword }),
    [usuario, aviso, iniciarSesion, cerrarSesion, cambiarPassword])

  if (estado === 'cargando') {
    return (
      <main className="login">
        <div className="login__marca" role="status">
          <img src={logoBab} alt="Banco de Alimentos de Bogotá" />
          <p style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={18} className="girando" aria-hidden="true" /> Restaurando la sesión…
          </p>
          <AvisoDespertando />
        </div>
      </main>
    )
  }

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>
}
