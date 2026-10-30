import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import logoBab from '../assets/logo-bab.png'
import Campo from '../components/ui/Campo'

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // TODO Fase B: la validación pasará al backend con usuarios reales y contraseñas cifradas
  const handleSubmit = (e) => {
    e.preventDefault()
    if (usuario === 'Operario01' && password === 'OP01-BAB') {
      onLogin('Operario01')
    } else if (usuario === 'Operario02' && password === 'OP02-BAB') {
      onLogin('Operario02')
    } else {
      setError('Credenciales incorrectas. Acceso denegado.')
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
          {error && (
            <div className="estado-error" role="alert" style={{ marginBottom: 14 }}>
              <AlertCircle size={18} aria-hidden="true" /><span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <Campo etiqueta="Usuario">
              <input className="input" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
            </Campo>
            <Campo etiqueta="Contraseña">
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Campo>
            <button type="submit" className="btn btn--marca" style={{ marginTop: 6, padding: '11px 18px' }}>
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
