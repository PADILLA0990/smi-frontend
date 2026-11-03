import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Map as MapIcon, RefreshCw, Search, PackagePlus, MoveRight, FileClock, PackageSearch, Warehouse, Settings, MapPinOff } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { usePuede } from '../lib/auth'
import { useConfirmar, useAvisar } from '../lib/dialogos'
import { useLista, useOpciones } from '../lib/catalogos'
import { formatearNumero } from '../lib/formato'
import { ModalKardex } from './Inventario'
import PlanoZona from './mapa/PlanoZona'
import { maxHuecos } from '../lib/plano'

const normal = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const coincide = (p, q) => normal(p.codigo_producto).includes(q) || normal(p.descripcion).includes(q)

// Una estantería de frente: filas de nivel (arriba el más alto) por huecos. Sin capacidad: solo qué hay.
// Los niveles pueden tener distinta cantidad de huecos (en la Zona 1, uno más del nivel 2 hacia arriba).
const idRack = (rack) => `rack-${rack.codigo}`
function Rack({ rack, seleccion, resaltados, onElegir, destacado }) {
  const ocupados = rack.celdas.filter(c => c.productos.length > 0).length
  const columnas = maxHuecos(rack)
  const filas = []
  for (const c of rack.celdas) {
    if (filas.at(-1)?.[0].nivel !== c.nivel) filas.push([])
    filas.at(-1).push(c)
  }
  return (
    <section id={idRack(rack)} className={`card rack ${columnas > 4 ? 'rack--ancho' : ''} ${destacado ? 'rack--destacado' : ''}`} aria-label={`Rack ${rack.rack}`}>
      <header className="rack__cabecera">
        <div>
          <h3 className="rack__titulo">Rack {rack.rack}</h3>
          {rack.calle && <p className="rack__calle">Calle {rack.calle}</p>}
        </div>
        <Badge tono={ocupados ? 'azul' : 'gris'}>{formatearNumero(ocupados)} de {formatearNumero(rack.celdas.length)} con producto</Badge>
      </header>
      <div className="rack__cuadricula" role="grid" aria-label={`Huecos del rack ${rack.rack}`}>
        {filas.map(fila => (
          <div key={fila[0].nivel} className="rack__fila" role="row" style={{ gridTemplateColumns: `52px repeat(${columnas}, minmax(34px, 1fr))` }}>
            <span className="rack__nivel" role="rowheader">Nivel {fila[0].nivel}</span>
            {fila.map(c => {
              const n = c.productos.length
              const clases = ['hueco', n ? 'hueco--ocupado' : '', seleccion === c.codigo ? 'hueco--elegido' : '', resaltados.has(c.codigo) ? 'hueco--resaltado' : ''].join(' ')
              return (
                <button key={c.codigo} type="button" role="gridcell" className={clases} onClick={() => onElegir(c.codigo)}
                  aria-pressed={seleccion === c.codigo}
                  title={`${c.codigo}: ${n ? `${formatearNumero(n)} producto(s), ${formatearNumero(c.unidades)} unidades` : 'vacío'}`}>
                  <span className="hueco__valor">{n ? formatearNumero(c.unidades) : '—'}</span>
                  <span className="hueco__numero">{String(c.hueco).padStart(2, '0')}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

// Panel derecho: qué hay en la ubicación elegida y qué se puede hacer
function Detalle({ lugar, puede, onReubicar, onKardex, onIngresar }) {
  if (!lugar) {
    return <EmptyState icono={MapIcon} titulo="Elija un hueco o un área" mensaje="Haga clic en una casilla de un rack para ver qué contiene." />
  }
  return (
    <div className="detalle-hueco">
      <div className="detalle-hueco__codigo">{lugar.codigo}</div>
      <p className="texto-suave">{lugar.descripcion}</p>
      {lugar.productos.length === 0
        ? <p className="detalle-hueco__vacio">Vacío.</p>
        : (
          <ul className="detalle-hueco__productos">
            {lugar.productos.map(p => (
              <li key={p.id}>
                <div className="detalle-hueco__fila">
                  <span><b>{p.codigo_producto}</b> · {p.descripcion}</span>
                  <span className="detalle-hueco__unidades">{formatearNumero(p.cantidad)} u.</span>
                </div>
                <div className="detalle-hueco__meta">
                  {p.categoria}{p.cantidad_reservada > 0 && <> · <Badge tono="indigo">{formatearNumero(p.cantidad_reservada)} reservada(s)</Badge></>}
                  {p.activo === false && <> · <Badge tono="gris">Inactivo</Badge></>}
                </div>
                <div className="detalle-hueco__acciones">
                  {puede('productos:reubicar') && p.activo !== false && (
                    <button type="button" className="btn btn--secundario btn--sm" onClick={() => onReubicar(p)}><MoveRight size={14} aria-hidden="true" /> Reubicar</button>
                  )}
                  <button type="button" className="btn btn--fantasma btn--sm" onClick={() => onKardex(p)}><FileClock size={14} aria-hidden="true" /> Kardex</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      {puede('movimientos:registrar') && (
        <button type="button" className="btn btn--primario btn--sm detalle-hueco__ingresar" onClick={() => onIngresar(lugar.codigo)}>
          <PackagePlus size={14} aria-hidden="true" /> Ingresar aquí
        </button>
      )}
    </div>
  )
}

export default function InventarioMapa() {
  const puede = usePuede()
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const navegar = useNavigate()
  const opciones = useOpciones()
  const [parametrosUrl, setParametrosUrl] = useSearchParams()
  const ubicaciones = useLista('/api/ubicaciones').datos || []
  const [mapa, setMapa] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState(parametrosUrl.get('q') || '')
  const [kardex, setKardex] = useState(null)
  const [rackDestacado, setRackDestacado] = useState(null)
  const seleccion = parametrosUrl.get('ubicacion') || ''

  const cargar = useCallback(() => pedirJSON('/api/mapa')
    .then(d => { setMapa(d); setError('') })
    .catch(err => setError(err.message))
    .finally(() => setCargando(false)), [])
  useEffect(() => { cargar() }, [cargar])
  const actualizar = () => { setCargando(true); cargar() }

  // La ubicación elegida vive en la URL: se puede compartir el enlace a un hueco
  // En pantallas angostas el detalle queda arriba: se lleva la vista hasta él
  const elegir = (codigo) => {
    setParametrosUrl(p => { const n = new URLSearchParams(p); n.set('ubicacion', codigo); return n }, { replace: true })
    if (window.matchMedia('(max-width: 1100px)').matches) {
      setTimeout(() => document.querySelector('.mapa__detalle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    }
  }

  // Índice de todas las ubicaciones del mapa (huecos y áreas) con su descripción
  const lugares = useMemo(() => {
    const indice = {}
    for (const z of mapa?.zonas || []) {
      for (const e of z.estanterias) {
        for (const c of e.celdas) indice[c.codigo] = { ...c, descripcion: `${z.nombre} · Rack ${e.rack}${e.calle ? ` (calle ${e.calle})` : ''} · nivel ${c.nivel} · hueco ${String(c.hueco).padStart(2, '0')}` }
      }
      for (const a of z.areas) indice[a.codigo] = { ...a, descripcion: [z.nombre, a.nombre].filter(Boolean).join(' · ') }
    }
    return indice
  }, [mapa])

  const q = normal(busqueda.trim())
  const resaltados = useMemo(() => new Set(q.length < 2 ? [] : Object.values(lugares).filter(l => l.productos.some(p => coincide(p, q))).map(l => l.codigo)), [lugares, q])
  const fueraCoinciden = q.length >= 2 ? (mapa?.fuera_de_estanterias || []).filter(p => coincide(p, q)) : []

  const reubicar = async (prod) => {
    const nueva = await confirmar({
      titulo: `Reubicar ${prod.codigo_producto}`,
      mensaje: `${prod.descripcion} · ubicación actual: ${prod.ubicacion}`,
      textoConfirmar: 'Reubicar',
      campo: {
        etiqueta: 'Nueva ubicación',
        placeholder: 'Seleccione una ubicación…',
        opciones: ubicaciones.filter(u => u.codigo.toLowerCase() !== prod.ubicacion.toLowerCase()).map(u => ({ valor: u.codigo, etiqueta: [u.codigo, u.nombre].filter(Boolean).join(' · ') }))
      }
    })
    if (!nueva) return
    try {
      await pedirJSON(`/api/productos/${prod.id}`, { method: 'PUT', body: { codigo_estanteria: nueva } })
      avisar(`${prod.codigo_producto} reubicado en ${nueva}.`)
      elegir(nueva)
      cargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  // Clic en un rack del plano: lleva a su vista de frente y la marca un momento
  const irARack = (rack) => {
    setRackDestacado(rack.codigo)
    document.getElementById(idRack(rack))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setRackDestacado(null), 2000)
  }

  const ingresarAqui = (codigo) => navegar(`/movimientos?pestana=ingreso&ubicacion=${encodeURIComponent(codigo)}`)
  const r = mapa?.resumen

  return (
    <div>
      <PageHeader icono={MapIcon} titulo="Mapa de Bodega"
        subtitulo={r ? `${formatearNumero(r.estanterias)} estantería(s) · ${formatearNumero(r.huecos_ocupados)} de ${formatearNumero(r.huecos)} huecos con producto` : 'Estanterías y áreas de la bodega'}
        acciones={<button type="button" className="btn btn--secundario btn--sm" onClick={actualizar} disabled={cargando}>
          <RefreshCw size={14} aria-hidden="true" className={cargando ? 'girando' : ''} /> Actualizar
        </button>} />

      <ErrorState mensaje={error} onReintentar={actualizar} />

      <div className="card mapa-barra">
        <label className="mapa-buscar">
          <Search size={16} aria-hidden="true" />
          <input className="input" type="search" placeholder="¿Dónde está? Código o descripción" value={busqueda}
            onChange={e => setBusqueda(e.target.value)} aria-label="Buscar un producto en el mapa" />
        </label>
        {q.length >= 2 && (
          <span className="mapa-buscar__resultado" role="status">
            {resaltados.size + fueraCoinciden.length === 0
              ? 'Sin coincidencias en la bodega.'
              : `${formatearNumero(resaltados.size)} ubicación(es) resaltada(s)${fueraCoinciden.length ? ` · ${formatearNumero(fueraCoinciden.length)} fuera de estanterías` : ''}`}
          </span>
        )}
        <span className="mapa-leyenda" aria-hidden="true">
          <span><i className="hueco-muestra" /> Vacío</span>
          <span><i className="hueco-muestra hueco-muestra--ocupado" /> Con producto</span>
          {q.length >= 2 && <span><i className="hueco-muestra hueco-muestra--resaltado" /> Coincide</span>}
        </span>
      </div>

      <div className="mapa">
        <div className="mapa__zonas">
          {!mapa && !error && <Skeleton alto={300} />}
          {mapa && mapa.zonas.length === 0 && (
            <Card>
              <EmptyState icono={Warehouse} titulo="Aún no hay estanterías" mensaje="Un coordinador las crea en Configuración → Estanterías (puede cargar la distribución inicial con un clic)."
                accion={puede('configuracion:gestionar') && <Link to="/parametros?pestana=estanterias" className="btn btn--primario btn--sm"><Settings size={14} aria-hidden="true" /> Ir a Estanterías</Link>} />
            </Card>
          )}
          {mapa?.zonas.map(z => (
            <section key={z.zona} className="mapa-zona" aria-label={z.nombre}>
              <h2 className="seccion-titulo">{z.nombre}</h2>
              <PlanoZona zona={z} seleccion={seleccion} resaltados={resaltados} onRack={irARack} onArea={elegir} />
              {z.estanterias.length > 0 && (
                <div className="mapa-zona__racks">
                  {z.estanterias.map(e => <Rack key={e.id} rack={e} seleccion={seleccion} resaltados={resaltados} onElegir={elegir} destacado={rackDestacado === e.codigo} />)}
                </div>
              )}
              {z.areas.length > 0 && (
                <div className="mapa-zona__areas">
                  {z.areas.map(a => (
                    <button key={a.codigo} type="button" onClick={() => elegir(a.codigo)} aria-pressed={seleccion === a.codigo}
                      className={['area', a.productos.length ? 'area--ocupada' : '', seleccion === a.codigo ? 'hueco--elegido' : '', resaltados.has(a.codigo) ? 'hueco--resaltado' : ''].join(' ')}>
                      <span className="area__nombre">{a.codigo}</span>
                      <span className="area__valor">{a.productos.length ? `${formatearNumero(a.unidades)} u. · ${formatearNumero(a.productos.length)} prod.` : 'Vacía'}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <aside className="mapa__lateral">
          <Card titulo="Detalle de la ubicación" icono={PackageSearch} className="mapa__detalle">
            {mapa ? <Detalle lugar={lugares[seleccion]} puede={puede} onReubicar={reubicar} onKardex={setKardex} onIngresar={ingresarAqui} /> : <Skeleton alto={120} />}
          </Card>

          <Card titulo="Fuera de estanterías" icono={MapPinOff}
            subtitulo="Productos con unidades en Recepción, áreas u otras ubicaciones">
            {!mapa ? <Skeleton alto={80} /> : mapa.fuera_de_estanterias.length === 0
              ? <p className="texto-suave">Todo está en estanterías.</p>
              : (
                <ul className="lista-alertas">
                  {mapa.fuera_de_estanterias.map(p => (
                    <li key={p.id} className={q.length >= 2 && coincide(p, q) ? 'fila-resaltada' : ''}>
                      <div className="lista-alertas__fila">
                        <span><b>{p.codigo_producto}</b> · {p.descripcion}<br /><small className="texto-suave">{p.ubicacion} · {formatearNumero(p.cantidad)} u.</small></span>
                        {puede('productos:reubicar') && p.activo !== false && (
                          <button type="button" className="btn btn--secundario btn--sm" onClick={() => reubicar(p)}>Ubicar</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </aside>
      </div>

      {kardex && <ModalKardex producto={kardex} opciones={opciones} onCerrar={() => setKardex(null)} />}
    </div>
  )
}
