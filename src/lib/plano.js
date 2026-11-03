// Medidas del plano de la bodega, en "cuadros" (los del boceto)
export const FONDO_RACK = 2
export const LARGO_HUECO = 1.5

// Huecos del nivel más ancho (en la Zona 1 los niveles 2 a 4 tienen uno más que el nivel 1)
export const maxHuecos = (rack) => Math.max(rack.huecos, rack.huecos_superiores || 0)

// Rectángulo de un rack en el plano: 2 cuadros de fondo y 1,5 por hueco de largo
export function cajaRack(rack) {
  const largo = maxHuecos(rack) * LARGO_HUECO
  const { x, y, vertical } = rack.plano
  return vertical ? { x, y, ancho: FONDO_RACK, alto: largo } : { x, y, ancho: largo, alto: FONDO_RACK }
}

// Huecos de un nivel: del nivel 2 hacia arriba puede haber más (huecos_superiores)
export const huecosDelNivel = (rack, nivel) => (nivel >= 2 && rack.huecos_superiores ? rack.huecos_superiores : rack.huecos)

// Color de la franja de cada zona en la demarcación (contraste AA con texto blanco)
const COLORES_ZONA = ['#1f3d6b', '#b45309', '#047857', '#7c3aed', '#be123c', '#0e7490']
export const colorZona = (zona) => {
  const n = Number(String(zona).replace(/\D/g, ''))
  return COLORES_ZONA[(n > 0 ? n - 1 : 0) % COLORES_ZONA.length]
}
