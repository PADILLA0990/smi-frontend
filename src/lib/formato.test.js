import { test } from 'node:test'
import assert from 'node:assert'
import { formatearFecha, formatearFechaHora, formatearFechaCalendario, formatearNumero } from './formato.js'
import { tonoAccion } from './tonos.js'

// Normaliza los espacios especiales (no separables) que Intl usa en la hora
const limpio = (s) => s.replace(new RegExp('[' + String.fromCharCode(0xa0, 0x202f) + ']', 'g'), ' ')

test('Fecha dd/mm/aaaa en hora de Bogotá', () => {
  // 02:00 UTC del 13/10 son las 9:00 p. m. del 12/10 en Bogotá
  assert.strictEqual(formatearFecha('2026-10-13T02:00:00Z'), '12/10/2026')
})

test('Fecha y hora en formato de 12 horas', () => {
  assert.strictEqual(limpio(formatearFechaHora('2026-10-12T22:01:42Z')), '12/10/2026, 5:01 p. m.')
})

test('Fecha de calendario no se corre un día', () => {
  assert.strictEqual(formatearFechaCalendario('2026-10-31T00:00:00.000Z'), '31/10/2026')
})

test('Miles con punto, también en números de 4 cifras', () => {
  assert.strictEqual(formatearNumero(1234), '1.234')
  assert.strictEqual(formatearNumero(1250000), '1.250.000')
  assert.strictEqual(formatearNumero(25), '25')
})

test('Valores vacíos o inválidos muestran guion', () => {
  assert.strictEqual(formatearFecha(null), '—')
  assert.strictEqual(formatearFecha('no-es-fecha'), '—')
  assert.strictEqual(formatearNumero(undefined), '—')
})

test('Cada tipo de acción del historial tiene su color', () => {
  assert.strictEqual(tonoAccion('INGRESO NUEVO'), 'verde')
  assert.strictEqual(tonoAccion('INGRESO ADICIONAL'), 'verde')
  assert.strictEqual(tonoAccion('SALIDA/RETIRO'), 'naranja')
  assert.strictEqual(tonoAccion('SALIDA SBO'), 'naranja')
  assert.strictEqual(tonoAccion('REUBICACIÓN'), 'azul')
  assert.strictEqual(tonoAccion('AJUSTE'), 'morado')
  assert.strictEqual(tonoAccion('ELIMINACIÓN'), 'rojo')
  assert.strictEqual(tonoAccion('SBO DESPACHADA'), 'verde')
})
