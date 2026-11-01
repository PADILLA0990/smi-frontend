import { test } from 'node:test'
import assert from 'node:assert'
import { formatearDuracion, textoVencimiento, excesosDeStock, esParcial } from './solicitudes.js'

test('Duración legible', () => {
  assert.strictEqual(formatearDuracion(null), '—')
  assert.strictEqual(formatearDuracion(45), '45 min')
  assert.strictEqual(formatearDuracion(120), '2 h')
  assert.strictEqual(formatearDuracion(200), '3 h 20 min')
  assert.strictEqual(formatearDuracion(3 * 24 * 60 + 300), '3 d 5 h')
  assert.strictEqual(formatearDuracion(2 * 24 * 60), '2 d')
})

test('Texto del vencimiento', () => {
  assert.strictEqual(textoVencimiento({ activa: false, dias_para_vencer: null }), null)
  assert.strictEqual(textoVencimiento({ activa: true, dias_para_vencer: 0 }), 'Vence hoy')
  assert.strictEqual(textoVencimiento({ activa: true, dias_para_vencer: 1 }), 'Vence mañana')
  assert.strictEqual(textoVencimiento({ activa: true, dias_para_vencer: 4 }), 'Vence en 4 días')
})

test('Excesos de stock suman las líneas del mismo producto', () => {
  const productos = [{ codigo_producto: 'A', cantidad: 10, cantidad_reservada: 4 }, { codigo_producto: 'B', cantidad: 3 }]
  assert.deepStrictEqual(excesosDeStock([{ codigo_producto: 'A', cantidad_solicitada: '4' }, { codigo_producto: 'A', cantidad_solicitada: '3' }, { codigo_producto: 'B', cantidad_solicitada: '3' }], productos),
    [{ codigo: 'A', pedido: 7, libre: 6 }])
  assert.deepStrictEqual(excesosDeStock([{ codigo_producto: 'X', cantidad_solicitada: '9' }, { codigo_producto: '', cantidad_solicitada: '' }], productos), [])
})

test('Alistamiento parcial', () => {
  const items = [{ id: 1, cantidad_solicitada: 5 }, { id: 2, cantidad_solicitada: 2 }]
  assert.strictEqual(esParcial(items, { 1: 5, 2: 2 }), false)
  assert.strictEqual(esParcial(items, { 1: '3', 2: 2 }), true)
  assert.strictEqual(esParcial(items, {}), false)
})
