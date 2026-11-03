import { test } from 'node:test'
import assert from 'node:assert'
import { maxHuecos, cajaRack } from './plano.js'

test('maxHuecos toma el nivel más ancho', () => {
  assert.strictEqual(maxHuecos({ huecos: 4, huecos_superiores: 5 }), 5)
  assert.strictEqual(maxHuecos({ huecos: 4, huecos_superiores: null }), 4)
})

test('cajaRack: vertical u horizontal según el plano', () => {
  assert.deepStrictEqual(cajaRack({ huecos: 4, huecos_superiores: 5, plano: { x: 6, y: 3, vertical: true } }), { x: 6, y: 3, ancho: 2, alto: 7.5 })
  assert.deepStrictEqual(cajaRack({ huecos: 2, plano: { x: 1, y: 1, vertical: false } }), { x: 1, y: 1, ancho: 3, alto: 2 })
})
