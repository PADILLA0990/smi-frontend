// Líneas de los documentos de ingreso y salida (Fase D2): cálculo de unidades, validación y cuerpo para la API.
// Una línea: { clave, codigo, producto (existente) | null, nuevo (datos del producto a crear) | null, unidadId, cantidad }

let siguienteClave = 1
export const lineaVacia = () => ({ clave: siguienteClave++, codigo: '', producto: null, nuevo: null, unidadId: '', cantidad: '' })

// Agrega un producto nuevo al documento. "Otra condición" (claveOrigen) lo pone justo después de la línea
// original, que se conserva; si no, ocupa la primera línea vacía o va al final.
export const agregarLineaNueva = (lineas, claveOrigen, codigo, nuevo) => {
  const linea = { ...lineaVacia(), codigo, nuevo }
  if (claveOrigen !== undefined && claveOrigen !== null) {
    return lineas.flatMap(l => (l.clave === claveOrigen ? [l, linea] : [l]))
  }
  const vacia = lineas.find(l => !l.codigo.trim())
  return vacia ? lineas.map(l => (l === vacia ? { ...l, codigo, producto: null, nuevo } : l)) : [...lineas, linea]
}

export const ORIGENES = { DONACION: 'Donación', COMPRA: 'Compra' }
// Tipos de tercero que sirven para cada origen
export const TERCEROS_DE = { DONACION: ['DONANTE', 'AMBOS'], COMPRA: ['PROVEEDOR', 'AMBOS'] }

// Sin unidad elegida se cuenta en unidades sueltas (factor 1)
export const unidadDe = (unidades, unidadId) =>
  unidades.find(u => String(u.id) === String(unidadId)) || { nombre: 'Unidad', factor: 1 }

export const unidadesDe = (linea, unidades) => {
  const n = Number(linea.cantidad)
  return Number.isInteger(n) && n > 0 ? n * unidadDe(unidades, linea.unidadId).factor : 0
}

export const libreDe = (p) => p.cantidad - (p.cantidad_reservada || 0)

const conCodigo = (lineas) => lineas.filter(l => l.codigo.trim())

export function resumenLineas(lineas, unidades) {
  const validas = conCodigo(lineas)
  return { lineas: validas.length, unidades: validas.reduce((s, l) => s + unidadesDe(l, unidades), 0) }
}

// Problemas que impiden guardar; la API vuelve a validar todo
export function problemasLineas(lineas, unidades, { salida = false } = {}) {
  const problemas = []
  const validas = conCodigo(lineas)
  if (validas.length === 0) problemas.push('Agregue al menos un producto.')
  const vistos = new Set()
  validas.forEach((l, i) => {
    const n = lineas.indexOf(l) + 1
    const codigo = l.codigo.trim()
    if (!l.producto && !l.nuevo) problemas.push(`Línea ${n}: elija un producto de la lista${salida ? '' : ' o regístrelo como producto nuevo'}.`)
    if (vistos.has(codigo.toLowerCase())) problemas.push(`Línea ${n}: ${codigo} está repetido. Sume las cantidades en una sola línea.`)
    vistos.add(codigo.toLowerCase())
    const cantidad = Number(l.cantidad)
    if (!Number.isInteger(cantidad) || cantidad < 1) problemas.push(`Línea ${n}: la cantidad debe ser un número entero mayor a 0.`)
    else if (salida && l.producto && unidadesDe(l, unidades) > libreDe(l.producto)) {
      problemas.push(`Línea ${n}: ${codigo} solo tiene ${libreDe(l.producto)} unidades libres.`)
    }
    if (i > 99) problemas.push('Un documento admite máximo 100 líneas.')
  })
  return [...new Set(problemas)]
}

// Cuerpo de las líneas para POST /api/documentos/ingreso o /salida
export const cuerpoLineas = (lineas) => conCodigo(lineas).map(l => ({
  codigo_producto: l.codigo.trim(),
  cantidad: Number(l.cantidad),
  ...(l.unidadId ? { unidadId: Number(l.unidadId) } : {}),
  ...(l.nuevo ? { nuevo: l.nuevo } : {})
}))

// Código sugerido que no choque con otros productos nuevos del mismo documento (ROP-006 → ROP-007)
export function codigoLibre(codigo, usados) {
  const ocupado = (c) => usados.some(u => u.toLowerCase() === c.toLowerCase())
  const m = codigo.match(/^(.*?)(\d+)$/)
  if (!m) return codigo
  let n = Number(m[2])
  let candidato = codigo
  while (ocupado(candidato)) candidato = `${m[1]}${String(++n).padStart(m[2].length, '0')}`
  return candidato
}

// Codificación 001-RCM-B (docs/CODIFICACION.md del backend): consecutivo, tres letras y estado
export const PATRON_CODIGO = /^(\d{3})-([A-Z]{3})-([PBDX])$/
export const SUFIJO_CONDICION = { PERFECTO: 'P', BUENO: 'B', DETERIORO: 'D', DANADO: 'X' }

// El mismo artículo en otro estado comparte la base: 001-RCM-B → 001-RCM-D
export function codigoHermano(codigo, condicion) {
  const m = PATRON_CODIGO.exec(codigo || '')
  return m && SUFIJO_CONDICION[condicion] ? `${m[1]}-${m[2]}-${SUFIJO_CONDICION[condicion]}` : ''
}
