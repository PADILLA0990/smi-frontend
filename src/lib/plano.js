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
