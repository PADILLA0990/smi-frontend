import { useCallback, useEffect, useState } from 'react'
import { pedirJSON } from '../api'

// Carga una lista de la API (catálogos, ubicaciones…). Si falla, los formularios muestran el error y siguen vivos.
export function useLista(ruta) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const recargar = useCallback(() => pedirJSON(ruta)
    .then(d => { setDatos(d); setError('') })
    .catch(e => setError(e.message)), [ruta])
  useEffect(() => { recargar() }, [recargar])
  return { datos, error, recargar }
}

const OPCIONES_VACIAS = { condiciones: {}, grupos: [], tiposTercero: {}, tiposMotivo: {} }

// Listas fijas del backend: condiciones, grupos (género/edad) y tipos de tercero y motivo
export function useOpciones() {
  const { datos } = useLista('/api/catalogos/opciones')
  return datos || OPCIONES_VACIAS
}
