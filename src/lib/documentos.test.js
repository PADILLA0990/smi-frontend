import { test } from 'node:test'
import assert from 'node:assert'
import { lineaVacia, agregarLineaNueva, unidadesDe, resumenLineas, problemasLineas, cuerpoLineas, codigoLibre, codigoHermano } from './documentos.js'

const unidades = [{ id: 4, nombre: 'Caja', factor: 20 }]
const producto = { codigo_producto: 'ROP-005', cantidad: 30, cantidad_reservada: 5 }
const linea = (datos) => ({ ...lineaVacia(), ...datos })

test('Unidades de la línea según la unidad de manejo', () => {
  assert.strictEqual(unidadesDe(linea({ cantidad: '2', unidadId: '4' }), unidades), 40)
  assert.strictEqual(unidadesDe(linea({ cantidad: '3' }), unidades), 3)
  assert.strictEqual(unidadesDe(linea({ cantidad: 'x' }), unidades), 0)
  assert.deepStrictEqual(resumenLineas([linea({ codigo: 'A', cantidad: '2', unidadId: 4 }), linea({ codigo: 'B', cantidad: '1' }), linea()], unidades), { lineas: 2, unidades: 41 })
})

test('Problemas de las líneas', () => {
  assert.deepStrictEqual(problemasLineas([linea()], unidades), ['Agregue al menos un producto.'])
  const repetidas = [linea({ codigo: 'ROP-005', producto, cantidad: '1' }), linea({ codigo: 'rop-005', producto, cantidad: '1' })]
  assert.ok(problemasLineas(repetidas, unidades)[0].includes('repetido'))
  assert.ok(problemasLineas([linea({ codigo: 'X-1', cantidad: '1' })], unidades)[0].includes('producto nuevo'))
  assert.ok(problemasLineas([linea({ codigo: 'ROP-005', producto, cantidad: '0' })], unidades)[0].includes('mayor a 0'))
  // En una salida no se puede pasar del stock libre (30 - 5 = 25)
  assert.ok(problemasLineas([linea({ codigo: 'ROP-005', producto, cantidad: '2', unidadId: '4' })], unidades, { salida: true })[0].includes('25 unidades libres'))
  assert.deepStrictEqual(problemasLineas([linea({ codigo: 'ROP-005', producto, cantidad: '25' })], unidades, { salida: true }), [])
})

test('Cuerpo de las líneas para la API', () => {
  const nuevo = { descripcion: 'Linterna', categoriaId: 1 }
  assert.deepStrictEqual(cuerpoLineas([linea({ codigo: ' ROP-005 ', producto, cantidad: '2', unidadId: '4' }), linea({ codigo: 'HOG-001', nuevo, cantidad: '1' }), linea()]), [
    { codigo_producto: 'ROP-005', cantidad: 2, unidadId: 4 },
    { codigo_producto: 'HOG-001', cantidad: 1, nuevo }
  ])
})

test('Código sugerido libre dentro del documento', () => {
  assert.strictEqual(codigoLibre('ROP-006', []), 'ROP-006')
  assert.strictEqual(codigoLibre('ROP-006', ['rop-006', 'ROP-007']), 'ROP-008')
  assert.strictEqual(codigoLibre('ROP-099', ['ROP-099']), 'ROP-100')
  assert.strictEqual(codigoLibre('SIN-NUMERO', ['SIN-NUMERO']), 'SIN-NUMERO')
})

test('codigoHermano: misma base con el sufijo del nuevo estado', () => {
  assert.equal(codigoHermano('001-RCM-B', 'DETERIORO'), '001-RCM-D')
  assert.equal(codigoHermano('012-TCD-P', 'DANADO'), '012-TCD-X')
  assert.equal(codigoHermano('ROP-001', 'BUENO'), '')
  assert.equal(codigoHermano('001-RCM-B', 'OTRO'), '')
})

test('Otra condición suma una línea junto a la original y la conserva', () => {
  const datos = { descripcion: 'Tenis', condicion: 'DANADO' }
  const original = linea({ codigo: '001-ZTH-P', producto, cantidad: '7' })
  const otra = linea({ codigo: 'ROP-005', producto, cantidad: '1' })
  const resultado = agregarLineaNueva([original, otra], original.clave, '001-ZTH-X', datos)
  assert.deepStrictEqual(resultado.map(l => l.codigo), ['001-ZTH-P', '001-ZTH-X', 'ROP-005'])
  assert.strictEqual(resultado[0], original)
  assert.deepStrictEqual([resultado[1].nuevo, resultado[1].cantidad], [datos, ''])
  assert.notStrictEqual(resultado[1].clave, original.clave)
})

test('Producto nuevo sin línea de origen: usa la vacía o va al final', () => {
  const datos = { descripcion: 'Linterna' }
  const vacia = linea()
  const conVacia = agregarLineaNueva([linea({ codigo: 'ROP-005' }), vacia], undefined, 'HOG-001', datos)
  assert.deepStrictEqual(conVacia.map(l => [l.codigo, l.clave === vacia.clave]), [['ROP-005', false], ['HOG-001', true]])
  const alFinal = agregarLineaNueva([linea({ codigo: 'ROP-005' })], undefined, 'HOG-001', datos)
  assert.deepStrictEqual(alFinal.map(l => l.codigo), ['ROP-005', 'HOG-001'])
})
