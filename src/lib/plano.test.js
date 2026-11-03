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

test('Huecos por nivel y color de zona', async () => {
  const { huecosDelNivel, colorZona } = await import('./plano.js')
  const rack = { huecos: 4, huecos_superiores: 5 }
  assert.equal(huecosDelNivel(rack, 1), 4)
  assert.equal(huecosDelNivel(rack, 3), 5)
  assert.equal(huecosDelNivel({ huecos: 3, huecos_superiores: null }, 2), 3)
  assert.equal(colorZona('Z1'), '#1f3d6b')
  assert.equal(colorZona('Z2'), '#b45309')
  assert.equal(colorZona('Z7'), '#1f3d6b')
})
