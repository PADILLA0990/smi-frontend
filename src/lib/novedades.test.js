import { test } from 'node:test'
import assert from 'node:assert'
import { aCSV } from './novedades.js'
import { tonoAccion } from './tonos.js'

test('CSV con punto y coma, BOM y comillas donde hace falta', () => {
  const columnas = [{ titulo: 'Código', valor: f => f.c }, { titulo: 'Descripción', valor: f => f.d }]
  const csv = aCSV(columnas, [{ c: 'NOV-0001', d: 'Caja "rota"; mojada' }, { c: 'NOV-0002', d: null }])
  assert.strictEqual(csv, '﻿Código;Descripción\r\nNOV-0001;"Caja ""rota""; mojada"\r\nNOV-0002;')
})

test('Colores de las acciones de la Fase E', () => {
  assert.strictEqual(tonoAccion('DEVOLUCIÓN SBO'), 'verde')
  assert.strictEqual(tonoAccion('NOVEDAD'), 'ambar')
  assert.strictEqual(tonoAccion('SBO SUSTITUCIÓN'), 'indigo')
})
