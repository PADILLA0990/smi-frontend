import { useState, useEffect, useCallback } from 'react'
import { PackageSearch, Trash2, MapPin, PackageOpen, Pencil } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Campo from '../components/ui/Campo'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import ErrorState from '../components/ui/ErrorState'
import { useConfirmar, useAvisar } from '../lib/dialogos'
import { usePuede } from '../lib/auth'
import { useLista, useOpciones } from '../lib/catalogos'
import { formatearNumero, formatearFecha } from '../lib/formato'

const TONO_CONDICION = { PERFECTO: 'verde', BUENO: 'azul', DETERIORO: 'ambar', DANADO: 'rojo' }

// Edición de datos descriptivos (no cambia stock ni ubicación); queda en el historial como EDICIÓN
function ModalEditar({ producto, opciones, categorias, onCerrar, onGuardado }) {
  const inicial = {
    descripcion: producto.descripcion, categoriaId: producto.categoriaId ? String(producto.categoriaId) : '',
    condicion: producto.condicion || '', talla: producto.talla || '', grupo: producto.grupo || '',
    stock_minimo: producto.stock_minimo ?? '', activo: producto.activo !== false
  }
  const [form, setForm] = useState(inicial)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async (e) => {
    e.preventDefault()
    const cambios = Object.keys(form).filter(k => String(form[k]) !== String(inicial[k]))
    if (cambios.length === 0) return onCerrar()
    const valor = (k) => {
      if (k === 'categoriaId' || k === 'stock_minimo') return form[k] === '' ? null : Number(form[k])
      if (k === 'condicion' || k === 'grupo') return form[k] || null
      return form[k]
    }
    setGuardando(true)
    try {
      await pedirJSON(`/api/productos/${producto.id}`, { method: 'PATCH', body: Object.fromEntries(cambios.map(k => [k, valor(k)])) })
      onGuardado()
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Editar ${producto.codigo_producto}`} icono={Pencil} onCerrar={onCerrar} ancho
      acciones={<>
        <button type="button" className="btn btn--secundario" onClick={onCerrar}>Cancelar</button>
        <button type="submit" form="form-editar-producto" className="btn btn--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <form id="form-editar-producto" onSubmit={guardar} className="form-fila form-modal">
        {error && <div className="estado-error campo--completo" role="alert" style={{ marginBottom: 0 }}><span>{error}</span></div>}
        <Campo etiqueta="Descripción" tamano="completo">
          <input className="input" value={form.descripcion} maxLength={200} required onChange={e => setForm({ ...form, descripcion: e.target.value })} />
        </Campo>
        <Campo etiqueta="Categoría">
          <select className="select" value={form.categoriaId} required onChange={e => setForm({ ...form, categoriaId: e.target.value })}>
            {!form.categoriaId && <option value="">{producto.categoria} (sin enlazar)</option>}
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Condición">
          <select className="select" value={form.condicion} onChange={e => setForm({ ...form, condicion: e.target.value })}>
            <option value="">Sin especificar</option>
            {Object.entries(opciones.condiciones).map(([v, et]) => <option key={v} value={v}>{et}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Talla" tamano="angosto">
          <input className="input" value={form.talla} maxLength={20} onChange={e => setForm({ ...form, talla: e.target.value })} />
        </Campo>
        <Campo etiqueta="Género / grupo">
          <select className="select" value={form.grupo} onChange={e => setForm({ ...form, grupo: e.target.value })}>
            <option value="">Sin especificar</option>
            {opciones.grupos.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Stock mínimo" tamano="angosto">
          <input className="input" type="number" min="0" step="1" placeholder="Por defecto" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} />
        </Campo>
        <Campo etiqueta="Estado" ayuda="Un producto inactivo no recibe ingresos ni aparece para retiros.">
          <select className="select" value={form.activo ? 'si' : 'no'} onChange={e => setForm({ ...form, activo: e.target.value === 'si' })}>
            <option value="si">Activo</option>
            <option value="no">Inactivo</option>
          </select>
        </Campo>
      </form>
    </Modal>
  )
}

export default function Inventario() {
  const puede = usePuede()
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState(null)
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const opciones = useOpciones()
  const ubicaciones = useLista('/api/ubicaciones').datos || []
  const categorias = useLista('/api/catalogos/categorias?activos=1').datos || []

  const cargarInventario = useCallback(() => pedirJSON('/api/productos')
    .then(data => {
      setProductos(data)
      setError('')
    })
    .catch(err => setError(err.message)), [])

  useEffect(() => { cargarInventario() }, [cargarInventario])

  // El backend actualiza el producto y registra el historial en una sola operación
  const moverProducto = async (prod) => {
    const actual = prod.codigo_estanteria || prod.ubicacion_general
    const nuevaEstanteria = await confirmar({
      titulo: `Reubicar ${prod.codigo_producto}`,
      mensaje: `${prod.descripcion} · ubicación actual: ${actual}`,
      textoConfirmar: 'Reubicar',
      campo: {
        etiqueta: 'Nueva ubicación',
        placeholder: 'Seleccione una ubicación…',
        opciones: ubicaciones.filter(u => u.codigo !== actual).map(u => ({ valor: u.codigo, etiqueta: [u.codigo, u.nombre || u.zona].filter(Boolean).join(' · ') })),
        ayuda: '¿No está la que necesita? Un coordinador la agrega en Configuración → Ubicaciones.'
      }
    })
    if (!nuevaEstanteria) return

    try {
      await pedirJSON(`/api/productos/${prod.id}`, { method: 'PUT', body: { codigo_estanteria: nuevaEstanteria } })
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

  const hayAcciones = puede('productos:reubicar') || puede('productos:editar') || puede('productos:eliminar')

  const columnas = [
    {
      id: 'codigo_producto', titulo: 'Código', fija: true,
      render: p => <><span className="texto-codigo">{p.codigo_producto}</span>{p.activo === false && <div><Badge tono="gris">Inactivo</Badge></div>}</>
    },
    { id: 'descripcion', titulo: 'Descripción' },
    { id: 'categoria', titulo: 'Categoría', render: p => <Badge>{p.categoria}</Badge> },
    {
      id: 'condicion', titulo: 'Condición', valor: p => opciones.condiciones[p.condicion] || '',
      render: p => p.condicion ? <Badge tono={TONO_CONDICION[p.condicion]}>{opciones.condiciones[p.condicion] || p.condicion}</Badge> : <span className="texto-suave">—</span>
    },
    { id: 'talla', titulo: 'Talla', oculta: true, render: p => p.talla || '—' },
    { id: 'grupo', titulo: 'Género / grupo', oculta: true, render: p => p.grupo || '—' },
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
    hayAcciones && {
      id: 'acciones', titulo: 'Acciones', fija: true, ordenable: false, alinear: 'centro', valor: () => '',
      render: p => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {puede('productos:reubicar') && (
            <button className="btn btn--primario btn--sm" onClick={() => moverProducto(p)}>
              <MapPin size={14} aria-hidden="true" /> Reubicar
            </button>
          )}
          {puede('productos:editar') && (
            <button className="btn btn--secundario btn--sm" onClick={() => setEditando(p)} aria-label={`Editar ${p.codigo_producto}`} title="Editar datos del producto">
              <Pencil size={16} />
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
          busqueda="Buscar por código, descripción, categoría, condición o ubicación…"
          ordenInicial={{ id: 'codigo_producto', dir: 'asc' }}
          vacio={{ icono: PackageOpen, titulo: 'No hay productos en el inventario', mensaje: 'Registre un ingreso en "Ingresos y Retiros" para empezar.' }}
        />
      </Card>

      {editando && (
        <ModalEditar producto={editando} opciones={opciones} categorias={categorias}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { avisar(`${editando.codigo_producto} actualizado.`); setEditando(null); cargarInventario() }} />
      )}
    </div>
  )
}
