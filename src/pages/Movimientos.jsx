import { useState, useEffect, useCallback } from 'react'
import { ArrowRightLeft, PackagePlus, PackageMinus, Wand2 } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Campo from '../components/ui/Campo'
import SelectBuscable from '../components/ui/SelectBuscable'
import { useAvisar } from '../lib/dialogos'
import { useSesion } from '../lib/auth'
import { useLista, useOpciones } from '../lib/catalogos'
import { formatearNumero } from '../lib/formato'

const FORM_INGRESO_VACIO = {
  codigo_producto: '', descripcion: '', categoriaId: '', cantidad: '', ubicacion_general: 'Recepción',
  condicion: '', talla: '', grupo: '', stock_minimo: ''
}
const FORM_SALIDA_VACIO = { codigo_producto: '', motivoId: '', detalle: '', cantidad: '' }

const libre = (p) => p.cantidad - (p.cantidad_reservada || 0)

export default function Movimientos() {
  const { usuario } = useSesion()
  const [formIngreso, setFormIngreso] = useState(FORM_INGRESO_VACIO)
  const [formSalida, setFormSalida] = useState(FORM_SALIDA_VACIO)
  const [productos, setProductos] = useState([])
  const [guardando, setGuardando] = useState('')
  const avisar = useAvisar()
  const opciones = useOpciones()
  const categorias = useLista('/api/catalogos/categorias?activos=1').datos || []
  const ubicaciones = useLista('/api/ubicaciones').datos || []
  const motivos = useLista('/api/catalogos/motivos?activos=1&tipo=SALIDA').datos || []

  // Solo alimenta el autocompletado: si falla, los formularios siguen funcionando
  const cargarProductos = useCallback(() => pedirJSON('/api/productos').then(setProductos).catch(() => setProductos([])), [])
  useEffect(() => { cargarProductos() }, [cargarProductos])

  const existente = productos.find(p => p.codigo_producto === formIngreso.codigo_producto.trim())
  const productoSalida = productos.find(p => p.codigo_producto === formSalida.codigo_producto)

  const opcionesIngreso = productos.map(p => ({ valor: p.codigo_producto, etiqueta: p.descripcion, detalle: `stock ${formatearNumero(p.cantidad)}`, producto: p }))
  const opcionesSalida = productos.filter(p => p.activo !== false).map(p => ({ valor: p.codigo_producto, etiqueta: p.descripcion, detalle: `libre ${formatearNumero(libre(p))}`, producto: p }))

  const cambiarIngreso = (campos) => setFormIngreso(f => ({ ...f, ...campos }))

  // Propone el siguiente código de la categoría (p. ej. ROP-006)
  const sugerirCodigo = async (categoriaId = formIngreso.categoriaId) => {
    if (!categoriaId) return
    try {
      const { codigo } = await pedirJSON(`/api/catalogos/categorias/${categoriaId}/siguiente-codigo`)
      if (codigo) cambiarIngreso({ codigo_producto: codigo })
      else avisar('Esa categoría no tiene prefijo: escriba el código manualmente.', 'error')
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const elegirCategoria = (categoriaId) => {
    cambiarIngreso({ categoriaId })
    if (categoriaId && !formIngreso.codigo_producto.trim()) sugerirCodigo(categoriaId)
  }

  // El backend crea el producto (o suma al stock si el código ya existe) y registra el historial
  const registrarIngreso = async (e) => {
    e.preventDefault()
    setGuardando('ingreso')
    const f = formIngreso
    try {
      const { producto, adicional } = await pedirJSON('/api/productos', {
        method: 'POST',
        body: existente
          ? { codigo_producto: f.codigo_producto, descripcion: existente.descripcion, cantidad: parseInt(f.cantidad) }
          : {
              codigo_producto: f.codigo_producto, descripcion: f.descripcion, categoriaId: Number(f.categoriaId), cantidad: parseInt(f.cantidad),
              ubicacion_general: f.ubicacion_general, condicion: f.condicion || null, talla: f.talla, grupo: f.grupo || null,
              stock_minimo: f.stock_minimo === '' ? null : Number(f.stock_minimo)
            }
      })
      avisar(adicional
        ? `${producto.codigo_producto} ya existía: se sumaron ${formatearNumero(Number(f.cantidad))} unidades (stock total: ${formatearNumero(producto.cantidad)}).`
        : `Ingreso de ${producto.codigo_producto} registrado por ${usuario.usuario}.`)
      setFormIngreso(FORM_INGRESO_VACIO)
      cargarProductos()
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setGuardando('')
    }
  }

  const registrarSalida = async (e) => {
    e.preventDefault()
    setGuardando('salida')
    try {
      const data = await pedirJSON('/api/salida', {
        method: 'POST',
        body: {
          codigo_producto: formSalida.codigo_producto,
          cantidad_retirada: parseInt(formSalida.cantidad),
          motivoId: Number(formSalida.motivoId),
          detalle: formSalida.detalle
        }
      })
      avisar(`Salida de ${formatearNumero(Number(formSalida.cantidad))} unidades de ${formSalida.codigo_producto} registrada.` +
        (data?.nuevaCantidad === 0 ? ' El producto se agotó y salió del inventario.' : ''))
      setFormSalida(FORM_SALIDA_VACIO)
      cargarProductos()
    } catch (err) {
      // Si el backend detecta un error (no existe, no hay stock, sin conexión), mostramos el motivo
      avisar(err.message, 'error')
    } finally {
      setGuardando('')
    }
  }

  return (
    <div>
      <PageHeader icono={ArrowRightLeft} titulo="Ingresos y Retiros" subtitulo="Registre la entrada de donaciones y las salidas de la bodega" />

      <Card titulo="Registrar ingreso" icono={PackagePlus} subtitulo="Si el código ya existe, la cantidad se suma a su stock. Elija primero la categoría para recibir un código sugerido.">
        <form onSubmit={registrarIngreso} className="form-fila">
          <Campo etiqueta="Categoría">
            {existente ? (
              <input className="input" value={existente.categoria} readOnly />
            ) : (
              <select className="select" value={formIngreso.categoriaId} onChange={e => elegirCategoria(e.target.value)} required>
                <option value="">Seleccione…</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.prefijo ? ` (${c.prefijo})` : ''}</option>)}
              </select>
            )}
          </Campo>
          <Campo etiqueta="Código / referencia" aviso={existente ? `Ya existe: se sumará a su stock actual (${formatearNumero(existente.cantidad)}).` : undefined}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SelectBuscable
                  opciones={opcionesIngreso}
                  valor={formIngreso.codigo_producto}
                  permitirLibre
                  required
                  placeholder="Ej: ROP-001"
                  onChange={(codigo, opcion) => cambiarIngreso(opcion
                    ? { codigo_producto: codigo, descripcion: opcion.producto.descripcion }
                    : { codigo_producto: codigo, ...(existente ? { descripcion: '' } : {}) })}
                />
              </div>
              {!existente && (
                <button type="button" className="btn btn--secundario" onClick={() => sugerirCodigo()} disabled={!formIngreso.categoriaId}
                  title="Sugerir el siguiente código de la categoría" aria-label="Sugerir código">
                  <Wand2 size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </Campo>
          <Campo etiqueta="Descripción del artículo" tamano="ancho">
            <input className="input" placeholder="Ej: Cobijas térmicas" value={existente ? existente.descripcion : formIngreso.descripcion} readOnly={!!existente}
              onChange={e => cambiarIngreso({ descripcion: e.target.value })} required />
          </Campo>
          <Campo etiqueta="Cantidad" tamano="angosto">
            <input className="input" type="number" min="1" step="1" placeholder="0" value={formIngreso.cantidad}
              onChange={e => cambiarIngreso({ cantidad: e.target.value })} required />
          </Campo>
          {!existente && <>
            <Campo etiqueta="Condición">
              <select className="select" value={formIngreso.condicion} onChange={e => cambiarIngreso({ condicion: e.target.value })}>
                <option value="">Sin especificar</option>
                {Object.entries(opciones.condiciones).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Talla" tamano="angosto">
              <input className="input" placeholder="Ej: M, 38" maxLength={20} value={formIngreso.talla} onChange={e => cambiarIngreso({ talla: e.target.value })} />
            </Campo>
            <Campo etiqueta="Género / grupo">
              <select className="select" value={formIngreso.grupo} onChange={e => cambiarIngreso({ grupo: e.target.value })}>
                <option value="">Sin especificar</option>
                {opciones.grupos.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Stock mínimo" tamano="angosto">
              <input className="input" type="number" min="0" step="1" placeholder="Por defecto" value={formIngreso.stock_minimo} onChange={e => cambiarIngreso({ stock_minimo: e.target.value })} />
            </Campo>
            <Campo etiqueta="Ubicación inicial">
              <select className="select" value={formIngreso.ubicacion_general} onChange={e => cambiarIngreso({ ubicacion_general: e.target.value })} required>
                {!ubicaciones.some(u => u.codigo === formIngreso.ubicacion_general) && <option value={formIngreso.ubicacion_general}>{formIngreso.ubicacion_general}</option>}
                {ubicaciones.map(u => <option key={u.id} value={u.codigo}>{u.codigo}{u.nombre ? ` · ${u.nombre}` : ''}</option>)}
              </select>
            </Campo>
          </>}
          <button type="submit" className="btn btn--exito" disabled={guardando === 'ingreso'}>
            {guardando === 'ingreso' ? 'Guardando…' : 'Registrar ingreso'}
          </button>
        </form>
      </Card>

      <Card titulo="Registrar salida / retiro" icono={PackageMinus} subtitulo="Solo se puede retirar el stock libre (lo reservado por SBO aprobadas no está disponible).">
        <form onSubmit={registrarSalida} className="form-fila">
          <Campo etiqueta="Código del producto" aviso={productoSalida ? `Disponible: ${formatearNumero(libre(productoSalida))} de ${formatearNumero(productoSalida.cantidad)} (${formatearNumero(productoSalida.cantidad_reservada || 0)} reservadas).` : undefined}>
            <SelectBuscable
              opciones={opcionesSalida}
              valor={formSalida.codigo_producto}
              required
              placeholder="Buscar código o descripción"
              mensajeVacio="Ese código no está en el inventario"
              onChange={codigo => setFormSalida(f => ({ ...f, codigo_producto: codigo }))}
            />
          </Campo>
          <Campo etiqueta="Motivo de la salida">
            <select className="select" value={formSalida.motivoId} onChange={e => setFormSalida({ ...formSalida, motivoId: e.target.value })} required>
              <option value="">Seleccione…</option>
              {motivos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Destino / detalle" tamano="ancho">
            <input className="input" placeholder="Opcional. Ej: Fundación XYZ, acta 123" maxLength={200} value={formSalida.detalle}
              onChange={e => setFormSalida({ ...formSalida, detalle: e.target.value })} />
          </Campo>
          <Campo etiqueta="Cantidad" tamano="angosto">
            <input className="input" type="number" min="1" step="1" placeholder="0" value={formSalida.cantidad}
              max={productoSalida ? Math.max(libre(productoSalida), 1) : undefined}
              onChange={e => setFormSalida({ ...formSalida, cantidad: e.target.value })} required />
          </Campo>
          <button type="submit" className="btn btn--peligro" disabled={guardando === 'salida'}>
            {guardando === 'salida' ? 'Guardando…' : 'Registrar salida'}
          </button>
        </form>
      </Card>
    </div>
  )
}
