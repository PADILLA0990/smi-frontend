// Código de barras Code 128 (juego B: letras, números y signos ASCII 32–126). Lo leen los lectores USB
// comunes, que "escriben" el código como un teclado. Devuelve los anchos en módulos: barra, espacio, barra…
export const PATRONES = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232'
]
export const INICIO_B = 104
export const PARADA = '2331112'

// Valores del código (inicio, datos y dígito de control) para un texto.
export function valoresCode128(texto) {
  const datos = [...String(texto)].map(c => {
    const v = c.charCodeAt(0) - 32
    if (v < 0 || v > 94) throw new Error(`Carácter no válido para el código de barras: "${c}"`)
    return v
  })
  const control = datos.reduce((s, v, i) => s + v * (i + 1), INICIO_B) % 103
  return [INICIO_B, ...datos, control]
}

// Anchos (en módulos) de barras y espacios alternados, empezando por barra, sin zonas de silencio.
export function anchosCode128(texto) {
  return (valoresCode128(texto).map(v => PATRONES[v]).join('') + PARADA).split('').map(Number)
}

// Barras listas para dibujar: [{ x, ancho }] en módulos, con zona de silencio a cada lado. Devuelve también el total.
export function barrasCode128(texto, silencio = 10) {
  const barras = []
  let x = silencio
  anchosCode128(texto).forEach((a, i) => {
    if (i % 2 === 0) barras.push({ x, ancho: a })
    x += a
  })
  return { barras, total: x + silencio }
}
