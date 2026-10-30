import { useState } from 'react'
import { KeyRound, AlertCircle } from 'lucide-react'
import logoBab from '../assets/logo-bab.png'
import Campo from '../components/ui/Campo'
import { useSesion } from '../lib/auth'
import { useAvisar } from '../lib/dialogos'

// Misma política que el backend (auth/credenciales.js)
function errorPolitica(clave) {
  if (clave.length < 10) return 'Debe tener al menos 10 caracteres.'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) || !/\d/.test(clave)) return 'Debe combinar letras y números.'
  return ''
}

// Formulario de cambio de contraseña. "obligatorio" = primer ingreso o contraseña restablecida:
// se muestra a pantalla completa y no deja usar el sistema hasta completarlo.
export default function CambiarPassword({ obligatorio = false, onListo }) {
  const { usuario, cambiarPassword, cerrarSesion } = useSesion()
  const avisar = useAvisar()
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const politica = form.nueva ? errorPolitica(form.nueva) : ''
  const noCoinciden = form.confirmar && form.nueva !== form.confirmar

  const enviar = async (e) => {
    e.preventDefault()
    if (politica || noCoinciden) return
    setEnviando(true)
    setError('')
    try {
      await cambiarPassword(form.actual, form.nueva)
      avisar('Contraseña actualizada.')
      onListo?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const formulario = (
    <form onSubmit={enviar} className="form-columna">
      {error && <div className="estado-error" role="alert" style={{ marginBottom: 0 }}><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
      <Campo etiqueta={obligatorio ? 'Contraseña temporal' : 'Contraseña actual'}>
        <input className="input" type="password" autoComplete="current-password" value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} required />
      </Campo>
      <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 10 caracteres, con letras y números." aviso={politica || undefined}>
        <input className="input" type="password" autoComplete="new-password" value={form.nueva} onChange={e => setForm({ ...form, nueva: e.target.value })} required />
      </Campo>
      <Campo etiqueta="Confirmar nueva contraseña" aviso={noCoinciden ? 'Las contraseñas no coinciden.' : undefined}>
        <input className="input" type="password" autoComplete="new-password" value={form.confirmar} onChange={e => setForm({ ...form, confirmar: e.target.value })} required />
      </Campo>
      <button type="submit" className="btn btn--primario" disabled={enviando || !!politica || !!noCoinciden}>
        {enviando ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
      {obligatorio && <button type="button" className="btn btn--fantasma" onClick={cerrarSesion}>Salir</button>}
    </form>
  )

  if (!obligatorio) return formulario

  return (
    <main className="login">
      <div className="login__caja">
        <div className="login__marca">
          <img src={logoBab} alt="Banco de Alimentos de Bogotá" />
          <h1 style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}><KeyRound size={24} aria-hidden="true" /> Cree su contraseña</h1>
          <p>Hola, {usuario.nombre}. Por seguridad debe cambiar la contraseña temporal antes de continuar.</p>
        </div>
        <div className="card">{formulario}</div>
      </div>
    </main>
  )
}
