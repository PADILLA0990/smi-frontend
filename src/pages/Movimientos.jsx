import { useState, useEffect, useCallback } from 'react'
import { ArrowRightLeft, PackagePlus, PackageMinus } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Campo from '../components/ui/Campo'
import SelectBuscable from '../components/ui/SelectBuscable'
import { useAvisar } from '../lib/dialogos'
import { formatearNumero } from '../lib/formato'

const FORM_INGRESO_VACIO = { codigo_producto: '', descripcion: '', categoria: '', cantidad: '', estado: 'Bueno', ubicacion_general: 'Recepción' }
const FORM_SALIDA_VACIO = { codigo_producto: '', motivo: '', cantidad: '' }

const libre = (p) => p.cantidad - (p.cantidad_reservada || 0)

export default function Movimientos({ usuarioActual }) {
  const [formIngreso, setFormIngreso] = useState(FORM_INGRESO_VACIO)
  const [formSalida, setFormSalida] = useState(FORM_SALIDA_VACIO)
  const [productos, setProductos] = useState([])
  const [guardando, setGuardando] = useState('')
  const avisar = useAvisar()

  // Solo alimenta el autocompletado: si falla, los formularios siguen funcionando
  const cargarProductos = useCallback(() => pedirJSON('/api/productos').then(setProductos).catch(() => setProductos([])), [])
  useEffect(() => { cargarProductos() }, [cargarProductos])

  const existente = productos.find(p => p.codigo_producto === formIngreso.codigo_producto.trim())
  const productoSalida = productos.find(p => p.codigo_producto === formSalida.codigo_producto)

  const opcionesIngreso = productos.map(p => ({ valor: p.codigo_producto, etiqueta: p.descripcion, detalle: `stock ${formatearNumero(p.cantidad)}`, producto: p }))
  const opcionesSalida = productos.map(p => ({ valor: p.codigo_producto, etiqueta: p.descripcion, detalle: `libre ${formatearNumero(libre(p))}`, producto: p }))

  // El backend crea el producto (o suma al stock si el código ya existe) y registra el historial
  const registrarIngreso = async (e) => {
    e.preventDefault()
    setGuardando('ingreso')
    try {
      const { producto, adicional } = await pedirJSON('/api/productos', {
        method: 'POST',
        body: { ...formIngreso, cantidad: parseInt(formIngreso.cantidad), operario: usuarioActual }
      })
      avisar(adicional
        ? `${producto.codigo_producto} ya existía: se sumaron ${formatearNumero(Number(formIngreso.cantidad))} unidades (stock total: ${formatearNumero(producto.cantidad)}).`
        : `Ingreso de ${producto.codigo_producto} registrado por ${usuarioActual}.`)
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
          motivo: formSalida.motivo,
          operario: usuarioActual
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

      <Card titulo="Registrar ingreso" icono={PackagePlus} subtitulo="Si el código ya existe, la cantidad se suma a su stock.">
        <form onSubmit={registrarIngreso} className="form-fila">
          <Campo etiqueta="Código / referencia" aviso={existente ? `Ya existe: se sumará a su stock actual (${formatearNumero(existente.cantidad)}).` : undefined}>
            <SelectBuscable
              opciones={opcionesIngreso}
              valor={formIngreso.codigo_producto}
              permitirLibre
              required
              placeholder="Ej: ROP-001"
              onChange={(codigo, opcion) => setFormIngreso(f => opcion
                ? { ...f, codigo_producto: codigo, descripcion: opcion.producto.descripcion, categoria: opcion.producto.categoria }
                : { ...f, codigo_producto: codigo, ...(existente ? { descripcion: '', categoria: '' } : {}) })}
            />
          </Campo>
          <Campo etiqueta="Descripción del artículo" tamano="ancho">
            <input className="input" placeholder="Ej: Cobijas térmicas" value={formIngreso.descripcion} readOnly={!!existente}
              onChange={e => setFormIngreso({ ...formIngreso, descripcion: e.target.value })} required />
          </Campo>
          <Campo etiqueta="Categoría">
            <input className="input" placeholder="Ej: Textiles" value={formIngreso.categoria} readOnly={!!existente}
              onChange={e => setFormIngreso({ ...formIngreso, categoria: e.target.value })} required />
          </Campo>
          <Campo etiqueta="Cantidad" tamano="angosto">
            <input className="input" type="number" min="1" step="1" placeholder="0" value={formIngreso.cantidad}
              onChange={e => setFormIngreso({ ...formIngreso, cantidad: e.target.value })} required />
          </Campo>
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
          <Campo etiqueta="Motivo de la salida / destino" tamano="ancho">
            <input className="input" placeholder="Ej: Entrega a Fundación XYZ" value={formSalida.motivo}
              onChange={e => setFormSalida({ ...formSalida, motivo: e.target.value })} required />
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
