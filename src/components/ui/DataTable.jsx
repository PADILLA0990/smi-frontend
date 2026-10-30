import { useMemo, useState } from 'react'
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Columns3, ChevronLeft, ChevronRight } from 'lucide-react'
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
 */
export default function DataTable({
  idTabla, columnas, filas, claveFila = 'id', busqueda = 'Buscar…', porPagina = 15,
  ordenInicial, vacio = {}, onFilaClick, filaActiva, herramientas
}) {
  const claveStorage = idTabla ? `smi-columnas-${idTabla}` : null
  const [texto, setTexto] = useState('')
  const [orden, setOrden] = useState(ordenInicial || null)
  const [pagina, setPagina] = useState(1)
  const [visibles, setVisibles] = useState(() =>
    (claveStorage && leerColumnas(claveStorage)) || columnas.filter(c => !c.oculta).map(c => c.id))

  const valorDe = (col, fila) => (col.valor ? col.valor(fila) : fila[col.id])
  const columnasVisibles = columnas.filter(c => c.fija || visibles.includes(c.id))

  const procesadas = useMemo(() => {
    if (!filas) return []
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
  }, [filas, texto, orden, columnas])

  const totalPaginas = Math.max(1, Math.ceil(procesadas.length / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visiblesPagina = procesadas.slice((paginaActual - 1) * porPagina, paginaActual * porPagina)

  const ordenarPor = (id) => {
    setOrden(o => (o?.id === id ? { id, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'asc' }))
  }

  const alternarColumna = (id) => {
    const nuevas = visibles.includes(id) ? visibles.filter(v => v !== id) : [...visibles, id]
    setVisibles(nuevas)
    if (claveStorage) { try { localStorage.setItem(claveStorage, JSON.stringify(nuevas)) } catch { /* sin almacenamiento */ } }
  }

  const configurables = columnas.filter(c => !c.fija)

  return (
    <div>
      {(busqueda || herramientas || configurables.length > 0) && (
        <div className="tabla-barra">
          {busqueda ? (
            <div className="tabla-buscar">
              <Search size={16} aria-hidden="true" />
              <input className="input" type="search" placeholder={busqueda} aria-label={busqueda} value={texto}
                onChange={e => { setTexto(e.target.value); setPagina(1) }} />
            </div>
          ) : <span />}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {herramientas}
            {configurables.length > 1 && (
              <details className="menu-columnas">
                <summary className="btn btn--secundario btn--sm"><Columns3 size={14} aria-hidden="true" /> Columnas</summary>
                <div className="menu-columnas__lista">
                  {configurables.map(c => (
                    <label key={c.id}>
                      <input type="checkbox" checked={visibles.includes(c.id)} onChange={() => alternarColumna(c.id)} />
                      {c.titulo}
                    </label>
                  ))}
                </div>
              </details>
            )}
          </div>
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
              {formatearNumero(procesadas.length)} registro{procesadas.length === 1 ? '' : 's'}
              {texto && filas.length !== procesadas.length && ` (de ${formatearNumero(filas.length)})`}
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
