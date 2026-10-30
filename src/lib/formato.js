// Formatos de Colombia: fechas dd/mm/aaaa, hora de 12 h, zona America/Bogota y miles con punto
const ZONA = 'America/Bogota'

const fFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ZONA })
const fHora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: ZONA })
const fHoraSeg = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: ZONA })
// Fechas "de calendario" (sin hora, guardadas como medianoche UTC): se muestran en UTC para no correr el día
const fFechaCalendario = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
// useGrouping 'always': en español los números de 4 cifras no se agrupan por defecto (1234 → 1.234)
const fNumero = new Intl.NumberFormat('es-CO', { useGrouping: 'always', maximumFractionDigits: 2 })

const valida = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null
  const d = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatearFecha(valor) {
  const d = valida(valor)
  return d ? fFecha.format(d) : '—'
}

export function formatearFechaHora(valor) {
  const d = valida(valor)
  return d ? `${fFecha.format(d)}, ${fHora.format(d)}` : '—'
}

export function formatearHora(valor, { segundos = false } = {}) {
  const d = valida(valor)
  return d ? (segundos ? fHoraSeg : fHora).format(d) : '—'
}

export function formatearFechaCalendario(valor) {
  const d = valida(valor)
  return d ? fFechaCalendario.format(d) : '—'
}

export function formatearNumero(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) ? fNumero.format(valor) : '—'
}
