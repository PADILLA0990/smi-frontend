// Solicitudes SBO (Fase D3): estados, acciones y textos calculados que comparten la lista, el detalle y la remisión
import { formatearNumero } from './formato.js'

export const ESTADOS_SBO = ['CREADA', 'APROBADA', 'EN_ALISTAMIENTO', 'ALISTADA', 'DESPACHADA', 'CANCELADA', 'VENCIDA']

export const FILTROS_SBO_VACIOS = { estado: '', organizacionId: '', alistador: '', desde: '', hasta: '', atrasada: false, porVencer: false }

export const ACCIONES_SBO = {
  aprobar:   { label: 'Aprobar',                clase: 'btn--primario' },
  iniciar:   { label: 'Iniciar alistamiento',   clase: 'btn--primario' },
  finalizar: { label: 'Finalizar alistamiento', clase: 'btn--primario' },
  despachar: { label: 'Despachar',              clase: 'btn--exito' },
  renovar:   { label: 'Renovar',                clase: 'btn--secundario' },
  cancelar:  { label: 'Cancelar solicitud',     clase: 'btn--peligro' }
}

// Duración en minutos → "45 min", "3 h 20 min", "2 d 5 h"
export function formatearDuracion(minutos) {
  if (minutos === null || minutos === undefined) return '—'
  if (minutos < 60) return `${minutos} min`
  if (minutos < 24 * 60) {
    const h = Math.floor(minutos / 60), m = minutos % 60
    return m ? `${h} h ${m} min` : `${h} h`
  }
  const d = Math.floor(minutos / (24 * 60)), h = Math.floor((minutos % (24 * 60)) / 60)
  return h ? `${formatearNumero(d)} d ${h} h` : `${formatearNumero(d)} d`
}

// Texto del vencimiento por falta de movimiento (solo solicitudes activas)
export function textoVencimiento(solicitud) {
  if (!solicitud?.activa || solicitud.dias_para_vencer === null || solicitud.dias_para_vencer === undefined) return null
  const d = solicitud.dias_para_vencer
  if (d <= 0) return 'Vence hoy'
  if (d === 1) return 'Vence mañana'
  return `Vence en ${formatearNumero(d)} días`
}

// Productos del formulario que piden más de lo libre (sumando líneas repetidas del mismo código)
export function excesosDeStock(items, productos) {
  const pedidos = {}
  for (const item of items) {
    const n = Number(item.cantidad_solicitada)
    if (!item.codigo_producto || !Number.isFinite(n) || n <= 0) continue
    pedidos[item.codigo_producto] = (pedidos[item.codigo_producto] || 0) + n
  }
  return Object.entries(pedidos).flatMap(([codigo, pedido]) => {
    const p = productos.find(x => x.codigo_producto === codigo)
    if (!p) return []
    const libre = p.cantidad - (p.cantidad_reservada || 0)
    return pedido > libre ? [{ codigo, pedido, libre }] : []
  })
}

// ¿El alistamiento capturado es parcial? (alguna cantidad menor a la solicitada)
export const esParcial = (items, cantidades) =>
  items.some(item => cantidades[item.id] !== undefined && cantidades[item.id] !== '' && Number(cantidades[item.id]) < item.cantidad_solicitada)
