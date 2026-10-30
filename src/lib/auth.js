import { createContext, useContext } from 'react'

// Contexto de la sesión. El proveedor está en components/AuthProvider.jsx
export const AuthContexto = createContext(null)

export const ETIQUETA_ROL = {
  ADMINISTRADOR: 'Administrador',
  COORDINADOR: 'Coordinador',
  OPERARIO: 'Operario',
  CONSULTA: 'Consulta'
}

export const TONO_ROL = {
  ADMINISTRADOR: 'indigo',
  COORDINADOR: 'cian',
  OPERARIO: 'azul',
  CONSULTA: 'gris'
}

// { usuario, iniciarSesion, cerrarSesion, cambiarPassword, actualizarUsuario }
export const useSesion = () => {
  const ctx = useContext(AuthContexto)
  if (!ctx) throw new Error('Falta <AuthProvider> en el árbol de componentes')
  return ctx
}

// puede('productos:eliminar') → true / false según los permisos que envía el backend.
// Solo sirve para ocultar botones: la validación real la hace el backend.
export const usePuede = () => {
  const { usuario } = useSesion()
  return (permiso) => !!usuario?.permisos?.includes(permiso)
}
