import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, KeyRound, UserCheck, UserX, ShieldCheck, Copy } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Campo from '../components/ui/Campo'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import ErrorState from '../components/ui/ErrorState'
import { useConfirmar, useAvisar } from '../lib/dialogos'
import { useSesion, ETIQUETA_ROL, TONO_ROL } from '../lib/auth'
import { formatearFechaHora } from '../lib/formato'

const ROLES = Object.keys(ETIQUETA_ROL)
const FORM_VACIO = { nombre: '', usuario: '', rol: 'OPERARIO' }

const bloqueado = (u) => u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()

// Muestra una contraseña temporal UNA sola vez, para entregarla al usuario
function ModalPassword({ datos, onCerrar }) {
  const avisar = useAvisar()
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(datos.password)
      avisar('Contraseña copiada.')
    } catch {
      avisar('No se pudo copiar: selecciónela y cópiela manualmente.', 'error')
    }
  }
  return (
    <Modal titulo={`Contraseña temporal de ${datos.usuario}`} icono={KeyRound} onCerrar={onCerrar}
      acciones={<button className="btn btn--primario" onClick={onCerrar} data-autofoco>Listo</button>}>
      <p>Entréguela personalmente. Solo se muestra esta vez y deberá cambiarse en el primer ingreso.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <code className="password-temporal">{datos.password}</code>
        <button className="btn btn--secundario btn--sm" onClick={copiar}><Copy size={14} aria-hidden="true" /> Copiar</button>
      </div>
    </Modal>
  )
}

function ModalRol({ usuario, onGuardar, onCerrar }) {
  const [rol, setRol] = useState(usuario.rol)
  return (
    <Modal titulo={`Cambiar rol de ${usuario.usuario}`} icono={ShieldCheck} onCerrar={onCerrar}
      acciones={<>
        <button className="btn btn--secundario" onClick={onCerrar}>Cancelar</button>
        <button className="btn btn--primario" disabled={rol === usuario.rol} onClick={() => onGuardar(rol)}>Guardar</button>
      </>}>
      <Campo etiqueta="Rol">
        <select className="select" value={rol} onChange={e => setRol(e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
        </select>
      </Campo>
    </Modal>
  )
}

export default function Usuarios() {
  const { usuario: yo } = useSesion()
  const [usuarios, setUsuarios] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [passwordMostrada, setPasswordMostrada] = useState(null)
  const [editandoRol, setEditandoRol] = useState(null)
  const confirmar = useConfirmar()
  const avisar = useAvisar()

  const cargar = useCallback(() => pedirJSON('/api/usuarios')
    .then(data => { setUsuarios(data); setError('') })
    .catch(err => setError(err.message)), [])

  useEffect(() => { cargar() }, [cargar])

  const crear = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const data = await pedirJSON('/api/usuarios', { method: 'POST', body: form })
      setPasswordMostrada({ usuario: data.usuario.usuario, password: data.passwordTemporal })
      setForm(FORM_VACIO)
      cargar()
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const actualizar = async (u, cambios, mensaje) => {
    try {
      await pedirJSON(`/api/usuarios/${u.id}`, { method: 'PATCH', body: cambios })
      avisar(mensaje)
      cargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const alternarActivo = async (u) => {
    const ok = await confirmar({
      titulo: `${u.activo ? 'Desactivar' : 'Activar'} a ${u.usuario}`,
      mensaje: u.activo ? 'No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Su historial se conserva.' : 'Podrá volver a iniciar sesión con su contraseña actual.',
      textoConfirmar: u.activo ? 'Desactivar' : 'Activar',
      peligro: u.activo
    })
    if (ok) actualizar(u, { activo: !u.activo }, `${u.usuario} ${u.activo ? 'desactivado' : 'activado'}.`)
  }

  const restablecer = async (u) => {
    const ok = await confirmar({
      titulo: `Restablecer contraseña de ${u.usuario}`,
      mensaje: 'Se generará una contraseña temporal, se desbloqueará el usuario y se cerrarán sus sesiones abiertas.',
      textoConfirmar: 'Restablecer'
    })
    if (!ok) return
    try {
      const data = await pedirJSON(`/api/usuarios/${u.id}/restablecer`, { method: 'POST' })
      setPasswordMostrada({ usuario: u.usuario, password: data.passwordTemporal })
      cargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const columnas = [
    { id: 'usuario', titulo: 'Usuario', fija: true, render: u => <span className="texto-codigo">{u.usuario}</span> },
    { id: 'nombre', titulo: 'Nombre' },
    { id: 'rol', titulo: 'Rol', valor: u => ETIQUETA_ROL[u.rol], render: u => <Badge tono={TONO_ROL[u.rol]}>{ETIQUETA_ROL[u.rol]}</Badge> },
    {
      id: 'estado', titulo: 'Estado', valor: u => (!u.activo ? 'Inactivo' : bloqueado(u) ? 'Bloqueado' : u.debe_cambiar_password ? 'Pendiente' : 'Activo'),
      render: u => !u.activo ? <Badge tono="gris">Inactivo</Badge>
        : bloqueado(u) ? <Badge tono="rojo" title="Por intentos fallidos">Bloqueado</Badge>
          : u.debe_cambiar_password ? <Badge tono="ambar" title="Debe cambiar la contraseña temporal">Pendiente</Badge>
            : <Badge tono="verde">Activo</Badge>
    },
    { id: 'ultimo_acceso', titulo: 'Último acceso', valor: u => u.ultimo_acceso, render: u => <span className="texto-suave texto-sm">{u.ultimo_acceso ? formatearFechaHora(u.ultimo_acceso) : 'Nunca'}</span> },
    {
      id: 'acciones', titulo: 'Acciones', fija: true, ordenable: false, alinear: 'centro', valor: () => '',
      render: u => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--secundario btn--sm" onClick={() => setEditandoRol(u)} disabled={u.id === yo.id} title={u.id === yo.id ? 'No puede cambiar su propio rol' : undefined}>
            <ShieldCheck size={14} aria-hidden="true" /> Rol
          </button>
          <button className="btn btn--secundario btn--sm" onClick={() => restablecer(u)}>
            <KeyRound size={14} aria-hidden="true" /> Restablecer
          </button>
          <button className={`btn btn--sm ${u.activo ? 'btn--secundario' : 'btn--exito'}`} style={u.activo ? { color: 'var(--peligro)' } : undefined}
            onClick={() => alternarActivo(u)} disabled={u.id === yo.id} aria-label={`${u.activo ? 'Desactivar' : 'Activar'} ${u.usuario}`}>
            {u.activo ? <UserX size={14} aria-hidden="true" /> : <UserCheck size={14} aria-hidden="true" />} {u.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader icono={Users} titulo="Gestión de usuarios" subtitulo="Cuentas, roles y acceso al sistema" />

      <ErrorState mensaje={error} onReintentar={() => { setError(''); cargar() }} />

      <Card titulo="Nuevo usuario" icono={UserPlus} subtitulo="Usuario de 3 a 30 caracteres (letras, números, punto o guion). Se genera una contraseña temporal que el usuario debe cambiar en su primer ingreso.">
        <form onSubmit={crear} className="form-fila">
          <Campo etiqueta="Nombre completo" tamano="ancho">
            <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </Campo>
          <Campo etiqueta="Usuario">
            <input className="input" value={form.usuario} pattern="[A-Za-z0-9._\-]{3,30}" placeholder="Ej: operario03" title="3 a 30 caracteres: letras, números, punto o guion."onChange={e => setForm({ ...form, usuario: e.target.value })} required />
          </Campo>
          <Campo etiqueta="Rol">
            <select className="select" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
            </select>
          </Campo>
          <button type="submit" className="btn btn--exito" disabled={guardando}>{guardando ? 'Creando…' : 'Crear usuario'}</button>
        </form>
      </Card>

      <Card titulo="Usuarios">
        <DataTable
          idTabla="usuarios"
          columnas={columnas}
          filas={error && !usuarios ? [] : usuarios}
          busqueda="Buscar por usuario, nombre o rol…"
          vacio={{ icono: Users, titulo: 'No hay usuarios' }}
        />
      </Card>

      {passwordMostrada && <ModalPassword datos={passwordMostrada} onCerrar={() => setPasswordMostrada(null)} />}
      {editandoRol && (
        <ModalRol usuario={editandoRol} onCerrar={() => setEditandoRol(null)}
          onGuardar={(rol) => { actualizar(editandoRol, { rol }, `${editandoRol.usuario} ahora es ${ETIQUETA_ROL[rol]}.`); setEditandoRol(null) }} />
      )}
    </div>
  )
}
