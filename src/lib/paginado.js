import { useCallback, useEffect, useState } from 'react'
import { pedirJSON } from '../api'
import { armarConsulta } from './consulta'

// Consulta paginada en la API ({ datos, total, resumen }). Espera un momento antes de pedir
// para no lanzar una petición por cada tecla en la búsqueda.
export function useConsultaPaginada(ruta, parametros, esperaMs = 250) {
  const consulta = armarConsulta(parametros)
  const [estado, setEstado] = useState({ datos: null, total: 0, resumen: null, error: '' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    const temporizador = setTimeout(() => {
      pedirJSON(`${ruta}?${consulta}`)
        .then(r => { if (vigente) setEstado({ datos: r.datos, total: r.total, resumen: r.resumen || null, error: '' }) })
        .catch(err => { if (vigente) setEstado(e => ({ ...e, datos: e.datos ?? [], error: err.message })) })
    }, esperaMs)
    return () => { vigente = false; clearTimeout(temporizador) }
  }, [ruta, consulta, esperaMs, version])

  const recargar = useCallback(() => setVersion(v => v + 1), [])
  return { ...estado, recargar }
}
