import test from 'node:test'
import assert from 'node:assert/strict'
import { PATRONES, PARADA, valoresCode128, anchosCode128 } from './code128.js'

test('Tabla Code 128: 106 patrones de 11 módulos, todos distintos', () => {
  assert.equal(PATRONES.length, 106)
  for (const p of PATRONES) assert.equal([...p].reduce((s, d) => s + Number(d), 0), 11, p)
  assert.equal(new Set(PATRONES).size, 106)
  assert.equal([...PARADA].reduce((s, d) => s + Number(d), 0), 13)
})

test('Valores y dígito de control', () => {
  // 104 + 48·1 + 42·2 + 42·3 + 17·4 + 18·5 + 19·6 + 35·7 = 879; 879 mod 103 = 55
  assert.deepEqual(valoresCode128('PJJ123C'), [104, 48, 42, 42, 17, 18, 19, 35, 55])
  const v = valoresCode128('Z1-A-2-04')
  assert.equal(v[0], 104)
  assert.equal(v.length, 9 + 2)
})

test('Anchos: módulos totales y carácter inválido', () => {
  const a = anchosCode128('Z1-A-2-04')
  assert.equal(a.reduce((s, x) => s + x, 0), 11 * 11 + 13)
  assert.equal(a.length, 11 * 6 + 7)
  assert.throws(() => anchosCode128('Ñ'), /no válido/)
})
