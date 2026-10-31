import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Settings, Tags, Building2, HandHeart, ListChecks, Boxes, MapPin, SlidersHorizontal, Plus, Pencil, Power, Inbox } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Campo from '../components/ui/Campo'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import ErrorState from '../components/ui/ErrorState'
import { SkeletonTabla } from '../components/ui/Skeleton'
import { useConfirmar, useAvisar } from '../lib/dialogos'
import { usePuede } from '../lib/auth'
import { useLista, useOpciones } from '../lib/catalogos'
import { formatearNumero } from '../lib/formato'

// Definición de cada catálogo: campos del formulario y columnas de la tabla.
// tipo: 'texto' (por defecto) | 'numero' | 'lista' (opciones de useOpciones); fijo: no se edita después de crear.
const CATALOGOS = {
  categorias: {
    singular: 'categoría', nuevo: 'Nueva categoría', icono: Tags, etiqueta: 'Categorías',
    descripcion: 'Clasificación de los artículos. El prefijo sugiere el código al registrar un ingreso (p. ej. ROP-006).',
    campos: [
      { id: 'nombre', etiqueta: 'Nombre', requerido: true },
      { id: 'prefijo', etiqueta: 'Prefijo de código', ayuda: '2 a 5 letras, ej. ROP', tamano: 'angosto', mayusculas: true },
      { id: 'descripcion', etiqueta: 'Descripción', tamano: 'completo' }
    ],
    columnas: [
      { id: 'prefijo', titulo: 'Prefijo', render: c => c.prefijo ? <span className="texto-codigo">{c.prefijo}</span> : '—' },
      { id: 'productos', titulo: 'Productos', alinear: 'num', render: c => formatearNumero(c.productos) },
      { id: 'descripcion', titulo: 'Descripción', render: c => <span className="texto-suave texto-sm">{c.descripcion || '—'}</span> }
    ]
  },
  organizaciones: {
    singular: 'organización', nuevo: 'Nueva organización', icono: Building2, etiqueta: 'Organizaciones',
    descripcion: 'Organizaciones beneficiarias que reciben las Solicitudes SBO.',
    campos: [
      { id: 'nombre', etiqueta: 'Nombre', requerido: true, tamano: 'ancho' },
      { id: 'nit', etiqueta: 'NIT', ayuda: 'Ej: 900123456-7' },
      { id: 'contacto', etiqueta: 'Persona de contacto' },
      { id: 'telefono', etiqueta: 'Teléfono' },
      { id: 'correo', etiqueta: 'Correo' },
      { id: 'localidad', etiqueta: 'Localidad' },
      { id: 'direccion', etiqueta: 'Dirección', tamano: 'ancho' }
    ],
    columnas: [
      { id: 'nit', titulo: 'NIT', render: o => o.nit || '—' },
      { id: 'contacto', titulo: 'Contacto', render: o => <>{o.contacto || '—'}{o.telefono && <div className="texto-suave texto-sm">{o.telefono}</div>}</> },
      { id: 'localidad', titulo: 'Localidad', render: o => o.localidad || '—' },
      { id: 'correo', titulo: 'Correo', oculta: true },
      { id: 'direccion', titulo: 'Dirección', oculta: true }
    ]
  },
  terceros: {
    singular: 'donante o proveedor', nuevo: 'Nuevo donante o proveedor', icono: HandHeart, etiqueta: 'Donantes y proveedores',
    descripcion: 'Quienes entregan artículos al banco: donantes, proveedores o ambos.',
    campos: [
      { id: 'tipo', etiqueta: 'Tipo', tipo: 'lista', opciones: 'tiposTercero', requerido: true },
      { id: 'nombre', etiqueta: 'Nombre', requerido: true, tamano: 'ancho' },
      { id: 'nit', etiqueta: 'NIT o documento' },
      { id: 'contacto', etiqueta: 'Persona de contacto' },
      { id: 'telefono', etiqueta: 'Teléfono' },
      { id: 'correo', etiqueta: 'Correo' }
    ],
    columnas: [
      { id: 'tipo', titulo: 'Tipo', lista: 'tiposTercero' },
      { id: 'nit', titulo: 'NIT', render: t => t.nit || '—' },
      { id: 'contacto', titulo: 'Contacto', render: t => <>{t.contacto || '—'}{t.telefono && <div className="texto-suave texto-sm">{t.telefono}</div>}</> },
      { id: 'correo', titulo: 'Correo', oculta: true }
    ]
  },
  motivos: {
    singular: 'motivo', nuevo: 'Nuevo motivo', icono: ListChecks, etiqueta: 'Motivos',
    descripcion: 'Motivos de salida, de ajuste y de novedad, por separado.',
    campos: [
      { id: 'tipo', etiqueta: 'Tipo', tipo: 'lista', opciones: 'tiposMotivo', requerido: true, fijo: true },
      { id: 'nombre', etiqueta: 'Nombre', requerido: true, tamano: 'ancho' }
    ],
    columnas: [{ id: 'tipo', titulo: 'Tipo', lista: 'tiposMotivo' }]
  },
  unidades: {
    singular: 'unidad de manejo', nuevo: 'Nueva unidad de manejo', icono: Boxes, etiqueta: 'Unidades de manejo',
    descripcion: 'Cómo llegan o salen los artículos y a cuántas unidades de inventario equivale cada una.',
    campos: [
      { id: 'nombre', etiqueta: 'Nombre', requerido: true },
      { id: 'abreviatura', etiqueta: 'Abreviatura', tamano: 'angosto' },
      { id: 'factor', etiqueta: 'Equivale a (unidades)', tipo: 'numero', requerido: true, tamano: 'angosto' }
    ],
    columnas: [
      { id: 'abreviatura', titulo: 'Abreviatura', render: u => u.abreviatura || '—' },
      { id: 'factor', titulo: 'Equivale a', alinear: 'num', render: u => `${formatearNumero(u.factor)} und` }
    ]
  },
  ubicaciones: {
    singular: 'ubicación', nuevo: 'Nueva ubicación', icono: MapPin, etiqueta: 'Ubicaciones', campoNombre: 'codigo',
    descripcion: 'Lugares de la bodega donde se puede guardar un producto. El Mapa de Bodega las consulta por API.',
    campos: [
      { id: 'codigo', etiqueta: 'Código', requerido: true, ayuda: 'Ej: AA02' },
      { id: 'nombre', etiqueta: 'Nombre o descripción', tamano: 'ancho' },
      { id: 'zona', etiqueta: 'Zona' },
      { id: 'estante', etiqueta: 'Estante', tamano: 'angosto' },
      { id: 'nivel', etiqueta: 'Nivel', tamano: 'angosto' },
      { id: 'posicion', etiqueta: 'Posición', tamano: 'angosto' }
    ],
    columnas: [
      { id: 'nombre', titulo: 'Nombre', render: u => u.nombre || '—' },
      { id: 'zona', titulo: 'Zona', render: u => u.zona || '—' },
      { id: 'detalle', titulo: 'Estante · nivel · posición', valor: u => [u.estante, u.nivel, u.posicion].filter(Boolean).join(' · '), render: u => [u.estante, u.nivel, u.posicion].filter(Boolean).join(' · ') || '—' },
      { id: 'productos', titulo: 'Productos', alinear: 'num', render: u => formatearNumero(u.productos) },
      { id: 'unidades', titulo: 'Unidades', alinear: 'num', render: u => formatearNumero(u.unidades) }
    ]
  }
}

const PESTANAS = [
  ...Object.entries(CATALOGOS).map(([id, c]) => ({ id, etiqueta: c.etiqueta, icono: c.icono })),
  { id: 'parametros', etiqueta: 'Parámetros', icono: SlidersHorizontal }
]

// Las ubicaciones se leen de /api/ubicaciones para traer cuántos productos tiene cada una
const rutaLista = (id) => (id === 'ubicaciones' ? '/api/ubicaciones?todas=1' : `/api/catalogos/${id}`)

function ModalRegistro({ catalogo, def, registro, opciones, onCerrar, onGuardado }) {
  const nuevo = !registro
  const [form, setForm] = useState(() => Object.fromEntries(def.campos.map(c => [c.id, registro?.[c.id] ?? (c.tipo === 'lista' ? Object.keys(opciones[c.opciones])[0] || '' : '')])))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    // En una edición solo viajan los campos que cambiaron (y nunca los fijos)
    const cuerpo = Object.fromEntries(def.campos
      .filter(c => nuevo || (!c.fijo && String(form[c.id] ?? '') !== String(registro[c.id] ?? '')))
      .map(c => [c.id, c.tipo === 'numero' && form[c.id] !== '' ? Number(form[c.id]) : form[c.id]]))
    try {
      if (!nuevo && Object.keys(cuerpo).length === 0) return onCerrar()
      const guardado = await pedirJSON(nuevo ? `/api/catalogos/${catalogo}` : `/api/catalogos/${catalogo}/${registro.id}`, { method: nuevo ? 'POST' : 'PATCH', body: cuerpo })
      onGuardado(guardado, nuevo)
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={nuevo ? def.nuevo : `Editar ${def.singular}`} icono={nuevo ? Plus : Pencil} onCerrar={onCerrar} ancho
      acciones={<>
        <button type="button" className="btn btn--secundario" onClick={onCerrar}>Cancelar</button>
        <button type="submit" form="form-catalogo" className="btn btn--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <form id="form-catalogo" onSubmit={guardar} className="form-fila form-modal">
        {error && <div className="estado-error campo--completo" role="alert" style={{ marginBottom: 0 }}><span>{error}</span></div>}
        {def.campos.map(c => (
          <Campo key={c.id} etiqueta={c.etiqueta + (c.requerido ? ' *' : '')} ayuda={c.fijo && !nuevo ? 'No se puede cambiar después de crear.' : c.ayuda} tamano={c.tamano}>
            {c.tipo === 'lista' ? (
              <select className="select" value={form[c.id]} disabled={c.fijo && !nuevo} onChange={e => setForm({ ...form, [c.id]: e.target.value })} required={c.requerido}>
                {Object.entries(opciones[c.opciones]).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
              </select>
            ) : (
              <input className="input" type={c.tipo === 'numero' ? 'number' : 'text'} min={c.tipo === 'numero' ? 1 : undefined} step={c.tipo === 'numero' ? 1 : undefined}
                value={form[c.id] ?? ''} required={c.requerido}
                onChange={e => setForm({ ...form, [c.id]: c.mayusculas ? e.target.value.toUpperCase() : e.target.value })} />
            )}
          </Campo>
        ))}
      </form>
    </Modal>
  )
}

function PestanaCatalogo({ catalogo }) {
  const def = CATALOGOS[catalogo]
  const campoNombre = def.campoNombre || 'nombre'
  const puede = usePuede()
  const gestiona = puede('configuracion:gestionar')
  const opciones = useOpciones()
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const { datos, error, recargar } = useLista(rutaLista(catalogo))
  const [editando, setEditando] = useState(null) // null: cerrado · {}: nuevo · registro: edición

  const alternarActivo = async (r) => {
    const ok = await confirmar({
      titulo: `${r.activo ? 'Desactivar' : 'Activar'} ${r[campoNombre]}`,
      mensaje: r.activo
        ? 'Dejará de aparecer en los formularios. Los movimientos y productos que ya lo usan se conservan.'
        : 'Volverá a aparecer en los formularios.',
      textoConfirmar: r.activo ? 'Desactivar' : 'Activar',
      peligro: r.activo
    })
    if (!ok) return
    try {
      await pedirJSON(`/api/catalogos/${catalogo}/${r.id}`, { method: 'PATCH', body: { activo: !r.activo } })
      avisar(`Se ${r.activo ? 'desactivó' : 'activó'} ${r[campoNombre]}.`)
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const columnas = [
    { id: campoNombre, titulo: campoNombre === 'codigo' ? 'Código' : 'Nombre', fija: true, render: r => <strong>{r[campoNombre]}</strong> },
    ...def.columnas.map(c => (c.lista ? { ...c, valor: r => opciones[c.lista][r[c.id]] || r[c.id], render: r => <Badge tono="azul">{opciones[c.lista][r[c.id]] || r[c.id]}</Badge> } : c)),
    { id: 'activo', titulo: 'Estado', valor: r => (r.activo ? 'Activo' : 'Inactivo'), render: r => <Badge tono={r.activo ? 'verde' : 'gris'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge> },
    gestiona && {
      id: 'acciones', titulo: 'Acciones', fija: true, ordenable: false, alinear: 'centro', valor: () => '',
      render: r => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--secundario btn--sm" onClick={() => setEditando(r)} aria-label={`Editar ${r[campoNombre]}`}>
            <Pencil size={14} aria-hidden="true" /> Editar
          </button>
          <button className={`btn btn--sm ${r.activo ? 'btn--secundario' : 'btn--exito'}`} style={r.activo ? { color: 'var(--peligro)' } : undefined}
            onClick={() => alternarActivo(r)} aria-label={`${r.activo ? 'Desactivar' : 'Activar'} ${r[campoNombre]}`}>
            <Power size={14} aria-hidden="true" /> {r.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      )
    }
  ].filter(Boolean)

  return (
    <Card titulo={def.etiqueta} icono={def.icono} subtitulo={def.descripcion}
      acciones={gestiona && <button className="btn btn--primario" onClick={() => setEditando({})}><Plus size={16} aria-hidden="true" /> Agregar</button>}>
      <ErrorState mensaje={error} onReintentar={recargar} />
      <DataTable
        idTabla={`catalogo-${catalogo}`}
        columnas={columnas}
        filas={error && !datos ? [] : datos}
        busqueda={`Buscar en ${def.etiqueta.toLowerCase()}…`}
        ordenInicial={{ id: campoNombre, dir: 'asc' }}
        vacio={{ icono: Inbox, titulo: `No hay registros en ${def.etiqueta.toLowerCase()}`, mensaje: gestiona ? 'Use "Agregar" para crear el primero.' : undefined }}
      />
      {editando && (
        <ModalRegistro catalogo={catalogo} def={def} registro={editando.id ? editando : null} opciones={opciones}
          onCerrar={() => setEditando(null)}
          onGuardado={(r, nuevo) => { setEditando(null); avisar(`Se ${nuevo ? 'creó' : 'actualizó'} ${r[campoNombre]}.`); recargar() }} />
      )}
    </Card>
  )
}

function PestanaParametros() {
  const gestiona = usePuede()('configuracion:gestionar')
  const avisar = useAvisar()
  const { datos, error, recargar } = useLista('/api/parametros')
  const [valores, setValores] = useState({})
  const [guardando, setGuardando] = useState(false)

  const valorDe = (p) => valores[p.clave] ?? String(p.valor)
  const cambios = (datos || []).filter(p => valorDe(p) !== String(p.valor))

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await pedirJSON('/api/parametros', { method: 'PUT', body: Object.fromEntries(cambios.map(p => [p.clave, Number(valorDe(p))])) })
      // Se espera la recarga antes de soltar lo editado, para no mostrar un instante el valor anterior
      await recargar()
      setValores({})
      avisar('Parámetros guardados.')
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card titulo="Parámetros de operación" icono={SlidersHorizontal} subtitulo="Valores que usan las alertas e indicadores. Si nadie los cambia se usa el valor por defecto.">
      <ErrorState mensaje={error} onReintentar={recargar} />
      {!datos && !error ? <SkeletonTabla filas={5} columnas={2} /> : datos && (
        <form onSubmit={guardar} className="form-columna" style={{ maxWidth: 560 }}>
          {datos.map(p => (
            <Campo key={p.clave} etiqueta={p.etiqueta} ayuda={`Por defecto: ${formatearNumero(p.defecto)} · entre ${formatearNumero(p.min)} y ${formatearNumero(p.max)}`}>
              <input className="input" type="number" min={p.min} max={p.max} step="1" required readOnly={!gestiona}
                value={valorDe(p)} onChange={e => setValores({ ...valores, [p.clave]: e.target.value })} />
            </Campo>
          ))}
          {gestiona && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn--primario" disabled={guardando || cambios.length === 0}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
              {cambios.length > 0 && <button type="button" className="btn btn--secundario" onClick={() => setValores({})}>Descartar</button>}
            </div>
          )}
        </form>
      )}
    </Card>
  )
}

export default function Configuracion() {
  const [params, setParams] = useSearchParams()
  const actual = PESTANAS.some(p => p.id === params.get('pestana')) ? params.get('pestana') : PESTANAS[0].id

  return (
    <div>
      <PageHeader icono={Settings} titulo="Configuración" subtitulo="Catálogos y parámetros del sistema" />
      <div className="pestanas" role="tablist" aria-label="Secciones de configuración">
        {PESTANAS.map(p => (
          <button key={p.id} role="tab" aria-selected={p.id === actual} className={`pestana ${p.id === actual ? 'pestana--activa' : ''}`}
            onClick={() => setParams({ pestana: p.id }, { replace: true })}>
            <p.icono size={16} aria-hidden="true" /> {p.etiqueta}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {actual === 'parametros' ? <PestanaParametros /> : <PestanaCatalogo key={actual} catalogo={actual} />}
      </div>
    </div>
  )
}
