// Color de cada acción del historial y de cada estado de SBO (clases .badge--<tono>)

export const TONO_ESTADO_SBO = {
  CREADA: 'azul',
  APROBADA: 'indigo',
  EN_ALISTAMIENTO: 'ambar',
  ALISTADA: 'cian',
  DESPACHADA: 'verde',
  CANCELADA: 'gris',
  VENCIDA: 'rojo'
}

export const ETIQUETA_ESTADO_SBO = {
  CREADA: 'Creada',
  APROBADA: 'Aprobada',
  EN_ALISTAMIENTO: 'En alistamiento',
  ALISTADA: 'Alistada',
  DESPACHADA: 'Despachada',
  CANCELADA: 'Cancelada',
  VENCIDA: 'Vencida'
}

export function tonoAccion(accion = '') {
  if (accion.startsWith('INGRESO')) return 'verde'
  if (accion.startsWith('SALIDA')) return 'naranja'
  if (accion.startsWith('REUBICACI')) return 'azul'
  if (accion.startsWith('AJUSTE')) return 'morado'
  if (accion.startsWith('ELIMINACI')) return 'rojo'
  // Eventos de SBO: "SBO APROBADA" toma el color de su estado
  if (accion === 'SBO RENOVADA') return 'cian'
  if (accion.startsWith('SBO ')) return TONO_ESTADO_SBO[accion.slice(4)] || 'gris'
  return 'gris'
}
