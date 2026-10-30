import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createScanDetector } from './scanDetector.js'

// Envía una secuencia de teclas separadas por `gap` ms y devuelve el último resultado no nulo
function teclear(detector, teclas, gap, inicio = 1000) {
  let resultado = null
  teclas.forEach((tecla, i) => {
    const r = detector.handleKey(tecla, inicio + i * gap)
    if (r) resultado = r
  })
  return resultado
}

const escanear = (codigo) => [...codigo, 'Enter']

test('detecta un código leído rápido y terminado en Enter', () => {
  assert.equal(teclear(createScanDetector(), escanear('7702001'), 10), '7702001')
})

test('ignora a una persona escribiendo lento', () => {
  assert.equal(teclear(createScanDetector(), escanear('7702001'), 120), null)
})

test('ignora códigos más cortos que minLength', () => {
  assert.equal(teclear(createScanDetector({ minLength: 4 }), escanear('123'), 10), null)
})

test('respeta el límite de 50ms entre caracteres', () => {
  assert.equal(teclear(createScanDetector(), escanear('ABCD'), 50), 'ABCD')
  assert.equal(teclear(createScanDetector(), escanear('ABCD'), 51), null)
})

test('Shift (mayúsculas del escáner) no corta la lectura', () => {
  const teclas = ['Shift', 'R', 'Shift', 'O', 'Shift', 'P', '-', '0', '0', '1', 'Enter']
  assert.equal(teclear(createScanDetector(), teclas, 5), 'ROP-001')
})

test('texto escrito a mano antes del escaneo no se mezcla con el código', () => {
  const d = createScanDetector()
  d.handleKey('h', 0)
  d.handleKey('o', 300)
  d.handleKey('l', 600)
  assert.equal(teclear(d, escanear('9900112'), 8, 2000), '9900112')
})

test('una tecla especial en medio reinicia la lectura', () => {
  const teclas = ['1', '2', '3', 'Backspace', '4', '5', 'Enter']
  assert.equal(teclear(createScanDetector(), teclas, 5), null)
})

test('mantener una tecla presionada (repeat) no cuenta como escaneo', () => {
  const d = createScanDetector()
  for (let i = 0; i < 6; i++) d.handleKey('a', 1000 + i * 30, { repeat: i > 0 })
  assert.equal(d.handleKey('Enter', 1180), null)
})

test('un Enter tardío después del código no cuenta como escaneo', () => {
  const d = createScanDetector()
  teclear(d, [...'12345'], 5)
  assert.equal(d.handleKey('Enter', 1000 + 4 * 5 + 500), null)
})

test('permite varios escaneos seguidos', () => {
  const d = createScanDetector()
  assert.equal(teclear(d, escanear('AAAA1'), 5, 1000), 'AAAA1')
  assert.equal(teclear(d, escanear('BBBB2'), 5, 3000), 'BBBB2')
})

test('Tab también funciona como fin de lectura', () => {
  assert.equal(teclear(createScanDetector(), [...'77020', 'Tab'], 5), '77020')
})
