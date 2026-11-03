import { useEffect, useState } from 'react'
import { AlertCircle, Info, Loader2 } from 'lucide-react'
import logoBab from '../assets/logo-bab.png'
import Campo from '../components/ui/Campo'
import { useSesion } from '../lib/auth'
import { despertarServidor } from '../lib/sesion'
import { useConectando } from '../lib/conexion'

// La validación de usuario y contraseña la hace el backend (contraseñas cifradas con bcrypt)
export default function Login() {
  const { iniciarSesion, aviso } = useSesion()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const conectando = useConectando()

  // Despierta el servidor mientras la persona escribe, para que el login no espere el arranque de Render
  useEffect(() => { despertarServidor() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await iniciarSesion(usuario.trim(), password)
    } catch (err) {
      setError(err.message)
      setPassword('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <div className="login__caja">
        <div className="login__marca">
          <img src={logoBab} alt="Banco de Alimentos de Bogotá" />
          <h1>SMI-ControlBAB</h1>
          <p>Plataforma de Control Logístico e Inventario</p>
        </div>

        <div className="card">
          {conectando && (
            <div className="aviso-info" role="status" style={{ marginBottom: 14 }}>
              <Loader2 size={18} className="girando" aria-hidden="true" />
              <span>Iniciando el sistema… La primera conexión después de un rato sin uso puede tardar hasta un minuto.</span>
            </div>
          )}
          {aviso && !error && !conectando && (
            <div className="aviso-info" role="status" style={{ marginBottom: 14 }}>
              <Info size={18} aria-hidden="true" /><span>{aviso}</span>
            </div>
          )}
          {error && (
            <div className="estado-error" role="alert" style={{ marginBottom: 14 }}>
              <AlertCircle size={18} aria-hidden="true" /><span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <Campo etiqueta="Usuario">
              <input className="input" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoFocus />
            </Campo>
            <Campo etiqueta="Contraseña">
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Campo>
            <button type="submit" className="btn btn--marca" disabled={enviando} style={{ marginTop: 6, padding: '11px 18px' }}>
              {enviando ? (conectando ? 'Esperando al servidor…' : 'Ingresando…') : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
