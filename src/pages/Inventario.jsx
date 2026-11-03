import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackageSearch, Trash2, MapPin, PackageOpen, Pencil, Ban, RotateCcw, FileClock, AlertTriangle, FilterX } from 'lucide-react'
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
import { useConsultaPaginada } from '../lib/paginado'
import { tonoAccion, TONO_ESTADO_SBO, ETIQUETA_ESTADO_SBO } from '../lib/tonos'
import { formatearNumero, formatearFecha, formatearFechaHora } from '../lib/formato'
import { PATRON_CODIGO } from '../lib/documentos'

const TONO_CONDICION = { PERFECTO: 'verde', BUENO: 'azul', DETERIORO: 'ambar', DANADO: 'rojo' }
const POR_PAGINA = 15
const FILTROS_VACIOS = { categoriaId: '', ubicacion: '', condicion: '', estado: 'activos', sinUbicar: false, bajoMinimo: false }

// Edición de datos descriptivos (no cambia stock ni ubicación); queda en el historial como EDICIÓN
function ModalEditar({ producto, opciones, categorias, onCerrar, onGuardado }) {
  const codificado = PATRON_CODIGO.test(producto.codigo_producto || '')
  const inicial = {
    descripcion: producto.descripcion, categoriaId: producto.categoriaId ? String(producto.categoriaId) : '',
    condicion: producto.condicion || '', talla: producto.talla || '', grupo: producto.grupo || '',
    stock_minimo: producto.stock_minimo ?? ''
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
        {codificado && <p className="aviso-info campo--completo" style={{ margin: 0 }}>El código {producto.codigo_producto} lleva la categoría y la condición: no se cambian aquí. Para otra condición, ingrese el artículo como producto nuevo (“otra condición”).</p>}
        <Campo etiqueta="Categoría">
          <select className="select" value={form.categoriaId} required disabled={codificado} onChange={e => setForm({ ...form, categoriaId: e.target.value })}>
            {!form.categoriaId && <option value="">{producto.categoria} (sin enlazar)</option>}
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Condición">
          <select className="select" value={form.condicion} disabled={codificado} onChange={e => setForm({ ...form, condicion: e.target.value })}>
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
      </form>
    </Modal>
  )
}

// Detalle del producto: datos, SBO en curso y kardex con saldo acumulado
export function ModalKardex({ producto, opciones, onCerrar }) {
  const [kardex, setKardex] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    pedirJSON(`/api/productos/${producto.id}/kardex`).then(setKardex).catch(e => setError(e.message))
  }, [producto.id])

  const p = kardex?.producto || producto
  const movimientos = kardex ? [...kardex.movimientos].reverse() : null

  return (
    <Modal titulo={`${p.codigo_producto} · ${p.descripcion}`} icono={FileClock} onCerrar={onCerrar} ancho
      acciones={<>
        <Link className="btn btn--secundario" to={`/historial?codigo=${encodeURIComponent(p.codigo_producto)}`}>Ver en el historial</Link>
        <Link className="btn btn--secundario" to={`/trazabilidad?codigo=${encodeURIComponent(p.codigo_producto)}`}>Trazabilidad</Link>
        <button type="button" className="btn btn--primario" onClick={onCerrar} data-autofoco>Cerrar</button>
      </>}>
      <dl className="ficha">
        <div><dt>Categoría</dt><dd>{p.categoria}</dd></div>
        <div><dt>Condición</dt><dd>{opciones.condiciones[p.condicion] || '—'}</dd></div>
        <div><dt>Ubicación</dt><dd>{p.codigo_estanteria || p.ubicacion_general}</dd></div>
        <div><dt>Total</dt><dd>{formatearNumero(p.cantidad)}</dd></div>
        <div><dt>Reservado</dt><dd>{formatearNumero(p.cantidad_reservada)}</dd></div>
        <div><dt>Libre</dt><dd>{formatearNumero(p.cantidad - p.cantidad_reservada)}</dd></div>
      </dl>
      {p.activo === false && <p className="texto-suave">Producto inactivo: no recibe ingresos ni se puede solicitar.</p>}

      {error && <div className="estado-error" role="alert"><span>{error}</span></div>}
      {kardex && !kardex.coincide && (
        <div className="aviso-alerta" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Según el historial deberían quedar <strong>{formatearNumero(kardex.saldo_historial)}</strong> unidades y el inventario tiene <strong>{formatearNumero(p.cantidad)}</strong>. Se revisa en un conteo físico (Conciliación).</span>
        </div>
      )}

      {kardex?.reservas.length > 0 && (
        <>
          <h3 className="subtitulo">Solicitudes SBO en curso</h3>
          <ul className="lista-simple">
            {kardex.reservas.map(s => (
              <li key={s.id}>
                <span className="texto-codigo">{s.codigo_sbo}</span> <Badge tono={TONO_ESTADO_SBO[s.estado]}>{ETIQUETA_ESTADO_SBO[s.estado]}</Badge>{' '}
                {formatearNumero(s.cantidad)} unidades para {s.organizacion}
                {!s.reserva_stock && <span className="texto-suave"> (sin reservar hasta que se apruebe)</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="subtitulo">Kardex</h3>
      {!movimientos ? <p className="texto-suave">Cargando movimientos…</p> : movimientos.length === 0 ? (
        <p className="texto-suave">Sin movimientos registrados.</p>
      ) : (
        <div className="tabla-scroll kardex">
          <table className="tabla">
            <thead><tr><th>Fecha</th><th>Acción</th><th>Usuario</th><th>Detalle</th><th className="num">Saldo</th></tr></thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id}>
                  <td className="texto-sm texto-suave">{formatearFechaHora(m.fecha)}</td>
                  <td><Badge tono={tonoAccion(m.accion)}>{m.accion}</Badge></td>
                  <td>{m.operario}</td>
                  <td className="texto-suave">
                    {m.documento && <><Link className="texto-codigo enlace" to={`/documentos/${m.documento.id}`} title="Ver el comprobante">{m.documento.numero}</Link>{' · '}</>}
                    {m.detalles || '—'}
                  </td>
                  <td className="num"><strong>{formatearNumero(m.saldo)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

export default function Inventario() {
  const puede = usePuede()
  const [parametrosUrl] = useSearchParams()
  const [texto, setTexto] = useState(parametrosUrl.get('q') || '')
  // ?sinUbicar=1 y ?bajoMinimo=1 llegan desde las alertas del Dashboard
  const [filtros, setFiltros] = useState(() => ({ ...FILTROS_VACIOS, sinUbicar: parametrosUrl.get('sinUbicar') === '1', bajoMinimo: parametrosUrl.get('bajoMinimo') === '1' }))
  const [orden, setOrden] = useState({ id: 'codigo_producto', dir: 'asc' })
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const opciones = useOpciones()
  const ubicaciones = useLista('/api/ubicaciones').datos || []
  const categorias = useLista('/api/catalogos/categorias?activos=1').datos || []

  const { datos, total, resumen, error, recargar } = useConsultaPaginada('/api/productos', {
    pagina, porPagina: POR_PAGINA, q: texto.trim(), ...filtros, orden: orden.id, dir: orden.dir
  })

  // Cualquier cambio de búsqueda o filtro vuelve a la primera página
  const cambiarFiltro = (campo, valor) => { setFiltros(f => ({ ...f, [campo]: valor })); setPagina(1) }
  const activos = Object.keys(FILTROS_VACIOS).filter(k => filtros[k] !== FILTROS_VACIOS[k]).length
  const hayFiltros = texto || activos > 0

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
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  // Inactivar o reactivar, siempre con una justificación que queda en el historial
  const cambiarEstado = async (prod) => {
    const inactivar = prod.activo !== false
    const justificacion = await confirmar({
      titulo: `${inactivar ? 'Inactivar' : 'Activar'} ${prod.codigo_producto}`,
      mensaje: inactivar
        ? `"${prod.descripcion}" dejará de recibir ingresos y no se podrá solicitar en SBO nuevas. Conserva sus ${formatearNumero(prod.cantidad)} unidades y su historial.`
        : `"${prod.descripcion}" volverá a recibir ingresos y a estar disponible para SBO.`,
      textoConfirmar: inactivar ? 'Inactivar' : 'Activar',
      peligro: inactivar,
      campo: { etiqueta: 'Justificación', placeholder: inactivar ? 'Ej.: descontinuado, se agotó y no volverá…' : 'Ej.: se volvió a recibir', ayuda: 'Entre 5 y 200 caracteres. Queda en el historial.' }
    })
    if (!justificacion) return
    try {
      await pedirJSON(`/api/productos/${prod.id}/${inactivar ? 'inactivar' : 'activar'}`, { method: 'POST', body: { justificacion } })
      avisar(`${prod.codigo_producto} ${inactivar ? 'inactivado' : 'activado'}.`)
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  // Borrado físico: solo Administrador y solo productos registrados por error (el backend lo valida)
  const borrarProducto = async (prod) => {
    const ok = await confirmar({
      titulo: `Borrar ${prod.codigo_producto} del sistema`,
      mensaje: `Solo para productos registrados por error que no tienen movimientos. Se borrará "${prod.descripcion}" (${formatearNumero(prod.cantidad)} unidades) y quedará constancia en el historial. Si el producto ya se usó, inactívelo.`,
      textoConfirmar: 'Borrar',
      peligro: true
    })
    if (!ok) return
    try {
      await pedirJSON(`/api/productos/${prod.id}`, { method: 'DELETE' })
      avisar(`${prod.codigo_producto} borrado del sistema.`)
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const hayAcciones = puede('productos:reubicar') || puede('productos:editar') || puede('productos:inactivar')

  const columnas = [
    {
      id: 'codigo_producto', titulo: 'Código', fija: true,
      render: p => <><span className="texto-codigo">{p.codigo_producto}</span>{p.activo === false && <div><Badge tono="gris">Inactivo</Badge></div>}</>
    },
    { id: 'descripcion', titulo: 'Descripción' },
    { id: 'categoria', titulo: 'Categoría', render: p => <Badge>{p.categoria}</Badge> },
    {
      id: 'condicion', titulo: 'Condición',
      render: p => p.condicion ? <Badge tono={TONO_CONDICION[p.condicion]}>{opciones.condiciones[p.condicion] || p.condicion}</Badge> : <span className="texto-suave">—</span>
    },
    { id: 'talla', titulo: 'Talla', oculta: true, ordenable: false, render: p => p.talla || '—' },
    { id: 'grupo', titulo: 'Género / grupo', oculta: true, ordenable: false, render: p => p.grupo || '—' },
    { id: 'cantidad', titulo: 'Total', alinear: 'num', render: p => formatearNumero(p.cantidad) },
    { id: 'reservado', titulo: 'Reservado', alinear: 'num', render: p => (p.cantidad_reservada > 0 ? <span className="texto-aviso" title="Apartadas por Solicitudes SBO aprobadas">{formatearNumero(p.cantidad_reservada)}</span> : <span className="texto-suave">0</span>) },
    {
      id: 'libre', titulo: 'Libre', alinear: 'num',
      render: p => (
        <>
          <strong>{formatearNumero(p.libre)}</strong>
          {p.bajo_minimo && <div><Badge tono="rojo" title={`Stock mínimo: ${formatearNumero(p.stock_minimo_efectivo)}`}>Bajo mínimo</Badge></div>}
        </>
      )
    },
    {
      id: 'ubicacion', titulo: 'Ubicación',
      render: p => (
        <>
          <div className="texto-suave texto-sm">{p.ubicacion_general}</div>
          <strong style={{ color: 'var(--navy-800)' }}>{p.codigo_estanteria || 'Sin asignar'}</strong>
        </>
      )
    },
    { id: 'ultima_actualizacion', titulo: 'Actualizado', render: p => <span className="texto-sm texto-suave">{formatearFecha(p.ultima_actualizacion)}</span> },
    { id: 'fecha_ingreso', titulo: 'Ingreso', oculta: true, render: p => formatearFecha(p.fecha_ingreso) },
    hayAcciones && {
      id: 'acciones', titulo: 'Acciones', fija: true, ordenable: false, alinear: 'centro',
      render: p => (
        // Los botones no abren el detalle de la fila
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
          {puede('productos:reubicar') && p.activo !== false && (
            <button className="btn btn--primario btn--sm" onClick={() => moverProducto(p)}>
              <MapPin size={14} aria-hidden="true" /> Reubicar
            </button>
          )}
          {puede('productos:editar') && (
            <button className="btn btn--secundario btn--sm" onClick={() => setEditando(p)} aria-label={`Editar ${p.codigo_producto}`} title="Editar datos del producto">
              <Pencil size={16} />
            </button>
          )}
          {puede('productos:inactivar') && (
            <button className="btn btn--secundario btn--sm" onClick={() => cambiarEstado(p)}
              aria-label={`${p.activo === false ? 'Activar' : 'Inactivar'} ${p.codigo_producto}`} title={p.activo === false ? 'Activar producto' : 'Inactivar producto'}
              style={p.activo === false ? undefined : { color: 'var(--peligro)' }}>
              {p.activo === false ? <RotateCcw size={16} /> : <Ban size={16} />}
            </button>
          )}
          {puede('productos:eliminar') && (
            <button className="btn btn--secundario btn--sm" style={{ color: 'var(--peligro)' }} onClick={() => borrarProducto(p)} aria-label={`Borrar ${p.codigo_producto}`} title="Borrar (solo productos registrados por error)">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ].filter(Boolean)

  const filtrosPanel = (
    <>
      <select className="select" aria-label="Categoría" value={filtros.categoriaId} onChange={e => cambiarFiltro('categoriaId', e.target.value)}>
        <option value="">Todas las categorías</option>
        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <select className="select" aria-label="Ubicación" value={filtros.ubicacion} onChange={e => cambiarFiltro('ubicacion', e.target.value)}>
        <option value="">Todas las ubicaciones</option>
        {ubicaciones.map(u => <option key={u.id} value={u.codigo}>{u.codigo}</option>)}
      </select>
      <select className="select" aria-label="Condición" value={filtros.condicion} onChange={e => cambiarFiltro('condicion', e.target.value)}>
        <option value="">Todas las condiciones</option>
        {Object.entries(opciones.condiciones).map(([v, et]) => <option key={v} value={v}>{et}</option>)}
        <option value="SIN">Sin especificar</option>
      </select>
      <select className="select" aria-label="Estado" value={filtros.estado} onChange={e => cambiarFiltro('estado', e.target.value)}>
        <option value="activos">Activos</option>
        <option value="inactivos">Inactivos</option>
        <option value="todos">Activos e inactivos</option>
      </select>
      <label className="filtro-check"><input type="checkbox" checked={filtros.sinUbicar} onChange={e => cambiarFiltro('sinUbicar', e.target.checked)} /> Sin ubicar</label>
      <label className="filtro-check"><input type="checkbox" checked={filtros.bajoMinimo} onChange={e => cambiarFiltro('bajoMinimo', e.target.checked)} /> Bajo stock mínimo</label>
    </>
  )

  return (
    <div>
      <PageHeader icono={PackageSearch} titulo="Inventario Maestro" subtitulo="Existencias, reservas y ubicación de cada artículo" />

      <ErrorState mensaje={error} onReintentar={recargar} />

      <Card>
        {resumen && (
          <p className="resumen-filtro">
            {formatearNumero(total)} producto{total === 1 ? '' : 's'} · <strong>{formatearNumero(resumen.unidades)}</strong> unidades
            · {formatearNumero(resumen.libres)} libres · {formatearNumero(resumen.reservadas)} reservadas
          </p>
        )}
        <DataTable
          idTabla="inventario-v2"
          columnas={columnas}
          filas={datos}
          porPagina={POR_PAGINA}
          busqueda="Buscar por código o descripción…"
          filtros={filtrosPanel}
          filtrosActivos={activos}
          onLimpiarFiltros={() => { setFiltros(FILTROS_VACIOS); setPagina(1) }}
          servidor={{
            total, pagina, onPagina: setPagina,
            orden, onOrden: (o) => { setOrden(o); setPagina(1) },
            texto, onTexto: (t) => { setTexto(t); setPagina(1) }
          }}
          onFilaClick={setDetalle}
          filaActiva={detalle?.id}
          vacio={hayFiltros
            ? { icono: FilterX, titulo: 'Ningún producto cumple los filtros', mensaje: 'Pruebe con otros filtros o límpielos.' }
            : { icono: PackageOpen, titulo: 'No hay productos en el inventario', mensaje: 'Registre un ingreso en "Ingresos y Retiros" para empezar.' }}
        />
      </Card>

      {detalle && <ModalKardex producto={detalle} opciones={opciones} onCerrar={() => setDetalle(null)} />}

      {editando && (
        <ModalEditar producto={editando} opciones={opciones} categorias={categorias}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { avisar(`${editando.codigo_producto} actualizado.`); setEditando(null); recargar() }} />
      )}
    </div>
  )
}
