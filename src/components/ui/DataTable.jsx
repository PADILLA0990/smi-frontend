import { useMemo, useState } from 'react'
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Columns3, ChevronLeft, ChevronRight, SlidersHorizontal, FilterX } from 'lucide-react'
import Desplegable from './Desplegable'
import { SkeletonTabla } from './Skeleton'
import EmptyState from './EmptyState'
import { formatearNumero } from '../../lib/formato'

const leerColumnas = (clave) => {
  try { return JSON.parse(localStorage.getItem(clave)) } catch { return null }
}

const normalizar = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Tabla con búsqueda, orden, paginación, columnas configurables y estado vacío.
 * columnas: [{ id, titulo, valor?: fila => valor para ordenar/buscar, render?: fila => JSX,
 *              alinear?: 'num' | 'centro', ordenable?: true, oculta?: false, fija?: false }]
 * filas: array, o null mientras carga.
 * servidor: si se pasa, la búsqueda, el orden y la paginación los resuelve la API y "filas" es solo la página actual:
 *   { total, pagina, onPagina, orden, onOrden, texto, onTexto }
 * filtros: campos de filtro (JSX) que van en el desplegable "Filtros", junto a la búsqueda.
 *   filtrosActivos: cuántos hay aplicados (se ve en el botón); onLimpiarFiltros: botón "Limpiar filtros".
 */
export default function DataTable({
  idTabla, columnas, filas, claveFila = 'id', busqueda = 'Buscar…', porPagina = 15,
  ordenInicial, vacio = {}, onFilaClick, filaActiva, herramientas, servidor, filtros, filtrosActivos = 0, onLimpiarFiltros
}) {
  const claveStorage = idTabla ? `smi-columnas-${idTabla}` : null
  const [textoLocal, setTextoLocal] = useState('')
  const [ordenLocal, setOrdenLocal] = useState(ordenInicial || null)
  const [paginaLocal, setPaginaLocal] = useState(1)
  const texto = servidor ? servidor.texto : textoLocal
  const orden = servidor ? servidor.orden : ordenLocal
  const pagina = servidor ? servidor.pagina : paginaLocal
  const setPagina = servidor ? servidor.onPagina : setPaginaLocal
  const setTexto = servidor ? servidor.onTexto : setTextoLocal
  const [visibles, setVisibles] = useState(() =>
    (claveStorage && leerColumnas(claveStorage)) || columnas.filter(c => !c.oculta).map(c => c.id))

  const valorDe = (col, fila) => (col.valor ? col.valor(fila) : fila[col.id])
  const columnasVisibles = columnas.filter(c => c.fija || visibles.includes(c.id))

  const procesadas = useMemo(() => {
    if (!filas) return []
    if (servidor) return filas
    let resultado = filas
    const q = normalizar(texto.trim())
    if (q) {
      resultado = resultado.filter(fila => columnas.some(col => normalizar(col.valor ? col.valor(fila) : fila[col.id]).includes(q)))
    }
    if (orden) {
      const col = columnas.find(c => c.id === orden.id)
      if (col) {
        const factor = orden.dir === 'asc' ? 1 : -1
        resultado = [...resultado].sort((a, b) => {
          const va = col.valor ? col.valor(a) : a[col.id]
          const vb = col.valor ? col.valor(b) : b[col.id]
          if (va == null) return 1
          if (vb == null) return -1
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
          return String(va).localeCompare(String(vb), 'es', { numeric: true }) * factor
        })
      }
    }
    return resultado
  }, [filas, texto, orden, columnas, servidor])

  const totalRegistros = servidor ? servidor.total : procesadas.length
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visiblesPagina = servidor ? procesadas : procesadas.slice((paginaActual - 1) * porPagina, paginaActual * porPagina)

  const ordenarPor = (id) => {
    const siguiente = (o) => (o?.id === id ? { id, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'asc' })
    if (servidor) servidor.onOrden(siguiente(orden))
    else setOrdenLocal(siguiente)
  }

  const alternarColumna = (id) => {
    const nuevas = visibles.includes(id) ? visibles.filter(v => v !== id) : [...visibles, id]
    setVisibles(nuevas)
    if (claveStorage) { try { localStorage.setItem(claveStorage, JSON.stringify(nuevas)) } catch { /* sin almacenamiento */ } }
  }

  const configurables = columnas.filter(c => !c.fija)

  return (
    <div>
      {(busqueda || filtros || herramientas || configurables.length > 1) && (
        <div className="tabla-barra">
          <div className="tabla-barra__grupo tabla-barra__grupo--busqueda">
            {busqueda && (
              <div className="tabla-buscar">
                <Search size={16} aria-hidden="true" />
                <input className="input" type="search" placeholder={busqueda} aria-label={busqueda} value={texto}
                  onChange={e => { setTexto(e.target.value); setPagina(1) }} />
              </div>
            )}
            {filtros && (
              <Desplegable etiqueta="Filtros" icono={SlidersHorizontal} contador={filtrosActivos} className="menu-filtros">
                <div className="panel-filtros">
                  {filtros}
                  {onLimpiarFiltros && filtrosActivos > 0 && (
                    <button type="button" className="btn btn--secundario btn--sm" onClick={onLimpiarFiltros}>
                      <FilterX size={14} aria-hidden="true" /> Limpiar filtros
                    </button>
                  )}
                </div>
              </Desplegable>
            )}
          </div>
          {(herramientas || configurables.length > 1) && (
            <div className="tabla-barra__grupo">
              {herramientas}
              {configurables.length > 1 && (
                <Desplegable etiqueta="Columnas" icono={Columns3} alinear="derecha" className="menu-columnas">
                  <div className="menu-columnas__lista">
                    {configurables.map(c => (
                      <label key={c.id}>
                        <input type="checkbox" checked={visibles.includes(c.id)} onChange={() => alternarColumna(c.id)} />
                        {c.titulo}
                      </label>
                    ))}
                  </div>
                </Desplegable>
              )}
            </div>
          )}
        </div>
      )}

      {!filas ? (
        <SkeletonTabla columnas={Math.min(columnasVisibles.length, 6)} />
      ) : procesadas.length === 0 ? (
        texto ? <EmptyState icono={Search} titulo="Sin resultados" mensaje={`Nada coincide con “${texto}”.`} />
          : <EmptyState {...vacio} />
      ) : (
        <>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  {columnasVisibles.map(col => {
                    const activa = orden?.id === col.id
                    const Flecha = !activa ? ArrowUpDown : orden.dir === 'asc' ? ArrowUp : ArrowDown
                    return (
                      <th key={col.id} className={col.alinear || ''} aria-sort={activa ? (orden.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                        {col.ordenable === false ? col.titulo : (
                          <button type="button" onClick={() => ordenarPor(col.id)}>
                            {col.titulo} <Flecha size={13} aria-hidden="true" style={{ opacity: activa ? 1 : 0.4 }} />
                          </button>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {visiblesPagina.map(fila => {
                  const clave = typeof claveFila === 'function' ? claveFila(fila) : fila[claveFila]
                  return (
                    <tr key={clave}
                      className={`${onFilaClick ? 'clicable' : ''} ${filaActiva === clave ? 'activa' : ''}`}
                      onClick={onFilaClick ? () => onFilaClick(fila) : undefined}
                      tabIndex={onFilaClick ? 0 : undefined}
                      onKeyDown={onFilaClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFilaClick(fila) } } : undefined}>
                      {columnasVisibles.map(col => (
                        <td key={col.id} className={col.alinear || ''}>
                          {col.render ? col.render(fila) : valorDe(col, fila) ?? '—'}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="tabla-pie">
            <span>
              {formatearNumero(totalRegistros)} registro{totalRegistros === 1 ? '' : 's'}
              {!servidor && texto && filas.length !== procesadas.length && ` (de ${formatearNumero(filas.length)})`}
            </span>
            {totalPaginas > 1 && (
              <div className="paginacion">
                <button className="btn btn--secundario btn--sm" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)} aria-label="Página anterior">
                  <ChevronLeft size={14} />
                </button>
                <span>Página {paginaActual} de {totalPaginas}</span>
                <button className="btn btn--secundario btn--sm" disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)} aria-label="Página siguiente">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
