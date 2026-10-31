import { test } from 'node:test'
import assert from 'node:assert'
import { armarConsulta } from './consulta.js'

test('armarConsulta omite vacíos y convierte booleanos', () => {
  assert.strictEqual(
    armarConsulta({ pagina: 2, q: 'ROP 5', categoriaId: '', sinUbicar: true, bajoMinimo: false, ubicacion: null, accion: 'INACTIVACIÓN' }),
    'pagina=2&q=ROP+5&sinUbicar=1&accion=INACTIVACI%C3%93N'
  )
})
