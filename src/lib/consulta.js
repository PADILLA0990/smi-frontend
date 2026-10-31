// Arma la consulta (?a=1&b=x) omitiendo los filtros vacíos; true se envía como "1"
export function armarConsulta(parametros) {
  const pares = Object.entries(parametros)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false)
    .map(([k, v]) => [k, v === true ? '1' : String(v)])
  return new URLSearchParams(pares).toString()
}
