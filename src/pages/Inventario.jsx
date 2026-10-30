import { useState, useEffect, useCallback } from 'react'
import { PackageSearch, Trash2, MapPin, PackageOpen } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import ErrorState from '../components/ui/ErrorState'
import { useConfirmar, useAvisar } from '../lib/dialogos'
import { usePuede } from '../lib/auth'
import { formatearNumero, formatearFecha } from '../lib/formato'

export default function Inventario() {
  const puede = usePuede()
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState('')
  const confirmar = useConfirmar()
  const avisar = useAvisar()

  const cargarInventario = useCallback(() => pedirJSON('/api/productos')
    .then(data => {
      setProductos(data)
      setError('')
    })
    .catch(err => setError(err.message)), [])

  useEffect(() => { cargarInventario() }, [cargarInventario])

  // El backend actualiza el producto y registra el historial en una sola operación
  const moverProducto = async (prod) => {
    const nuevaEstanteria = await confirmar({
      titulo: `Reubicar ${prod.codigo_producto}`,
      mensaje: `${prod.descripcion} · ubicación actual: ${prod.codigo_estanteria || prod.ubicacion_general}`,
      textoConfirmar: 'Reubicar',
      campo: { etiqueta: 'Nueva ubicación o estantería', placeholder: 'Ej: AA02, Bodega 2, Pasillo A' }
    })
    if (!nuevaEstanteria) return

    try {
      await pedirJSON(`/api/productos/${prod.id}`, {
        method: 'PUT',
        body: { ubicacion_general: 'Almacenamiento', codigo_estanteria: nuevaEstanteria }
      })
      avisar(`${prod.codigo_producto} reubicado en ${nuevaEstanteria}.`)
      cargarInventario()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const eliminarProducto = async (prod) => {
    const ok = await confirmar({
      titulo: `Eliminar ${prod.codigo_producto}`,
      mensaje: `Se retirará "${prod.descripcion}" (${formatearNumero(prod.cantidad)} unidades) del inventario. La acción quedará registrada en el historial.`,
      textoConfirmar: 'Eliminar',
      peligro: true
    })
    if (!ok) return

    try {
      await pedirJSON(`/api/productos/${prod.id}`, { method: 'DELETE' })
      avisar(`${prod.codigo_producto} eliminado del inventario.`)
      cargarInventario()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const columnas = [
    { id: 'codigo_producto', titulo: 'Código', fija: true, render: p => <span className="texto-codigo">{p.codigo_producto}</span> },
    { id: 'descripcion', titulo: 'Descripción' },
    { id: 'categoria', titulo: 'Categoría', render: p => <Badge>{p.categoria}</Badge> },
    {
      id: 'cantidad', titulo: 'Cantidad', alinear: 'num',
      render: p => (
        <>
          {formatearNumero(p.cantidad)}
          {p.cantidad_reservada > 0 && (
            <div className="texto-aviso" title="Apartadas por Solicitudes SBO aprobadas">{formatearNumero(p.cantidad_reservada)} reservadas</div>
          )}
        </>
      )
    },
    {
      id: 'ubicacion', titulo: 'Ubicación', valor: p => p.codigo_estanteria || p.ubicacion_general,
      render: p => (
        <>
          <div className="texto-suave texto-sm">{p.ubicacion_general}</div>
          <strong style={{ color: 'var(--navy-800)' }}>{p.codigo_estanteria || 'Sin asignar'}</strong>
        </>
      )
    },
    { id: 'fecha_ingreso', titulo: 'Ingreso', oculta: true, valor: p => p.fecha_ingreso, render: p => formatearFecha(p.fecha_ingreso) },
    (puede('productos:reubicar') || puede('productos:eliminar')) && {
      id: 'acciones', titulo: 'Acciones', fija: true, ordenable: false, alinear: 'centro', valor: () => '',
      render: p => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {puede('productos:reubicar') && (
            <button className="btn btn--primario btn--sm" onClick={() => moverProducto(p)}>
              <MapPin size={14} aria-hidden="true" /> Reubicar
            </button>
          )}
          {puede('productos:eliminar') && <button className="btn btn--secundario btn--sm" style={{ color: 'var(--peligro)' }} onClick={() => eliminarProducto(p)} aria-label={`Eliminar ${p.codigo_producto}`} title="Eliminar producto">
            <Trash2 size={16} />
          </button>}
        </div>
      )
    }
  ].filter(Boolean)

  return (
    <div>
      <PageHeader icono={PackageSearch} titulo="Inventario Maestro" subtitulo="Existencias, reservas y ubicación de cada artículo" />

      <ErrorState mensaje={error} onReintentar={() => { setError(''); cargarInventario() }} />

      <Card>
        <DataTable
          idTabla="inventario"
          columnas={columnas}
          filas={error && !productos ? [] : productos}
          busqueda="Buscar por código, descripción, categoría o ubicación…"
          ordenInicial={{ id: 'codigo_producto', dir: 'asc' }}
          vacio={{ icono: PackageOpen, titulo: 'No hay productos en el inventario', mensaje: 'Registre un ingreso en "Ingresos y Retiros" para empezar.' }}
        />
      </Card>
    </div>
  )
}
