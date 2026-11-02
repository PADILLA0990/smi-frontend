import { useState } from 'react'
import { Barcode, Wand2, Plus, Power, Pencil } from 'lucide-react'
import { pedirJSON } from '../../api'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import ErrorState from '../../components/ui/ErrorState'
import { SkeletonTabla } from '../../components/ui/Skeleton'
import { useConfirmar, useAvisar } from '../../lib/dialogos'
import { usePuede } from '../../lib/auth'
import { useLista } from '../../lib/catalogos'
import { formatearNumero } from '../../lib/formato'

// Lista de subcategorías o variantes de una categoría, con alta, renombre y activar/desactivar
function Nivel({ titulo, tipo, categoria, filas, gestiona, onCambio }) {
  const avisar = useAvisar()
  const confirmar = useConfirmar()
  const [nueva, setNueva] = useState({ letra: '', nombre: '' })

  const agregar = async (e) => {
    e.preventDefault()
    try {
      await pedirJSON(`/api/codificacion/categorias/${categoria.id}/${tipo}`, { method: 'POST', body: nueva })
      setNueva({ letra: '', nombre: '' })
      onCambio()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }
  const editar = async (fila, body) => {
    try {
      await pedirJSON(`/api/codificacion/${tipo}/${fila.id}`, { method: 'PATCH', body })
      onCambio()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }
  const renombrar = async (fila) => {
    const nombre = await confirmar({ titulo: `Renombrar ${fila.letra} · ${fila.nombre}`, textoConfirmar: 'Guardar', campo: { etiqueta: 'Nombre', valorInicial: fila.nombre } })
    if (nombre && nombre.trim() !== fila.nombre) editar(fila, { nombre })
  }

  return (
    <div className="codif-nivel">
      <h4 className="codif-nivel__titulo">{titulo}</h4>
      <ul className="codif-lista">
        {filas.map(f => (
          <li key={f.id} className={f.activo ? '' : 'codif-lista--inactiva'}>
            <span className="codif-letra">{f.letra}</span>
            <span className="codif-lista__nombre">{f.nombre}</span>
            {f.productos > 0 && <span className="texto-suave texto-sm">{formatearNumero(f.productos)} prod.</span>}
            {!f.activo && <Badge tono="gris">Inactiva</Badge>}
            {gestiona && (
              <span className="codif-lista__acciones">
                <button type="button" className="btn btn--fantasma btn--sm" onClick={() => renombrar(f)} aria-label={`Renombrar ${f.nombre}`}><Pencil size={14} aria-hidden="true" /></button>
                <button type="button" className="btn btn--fantasma btn--sm" onClick={() => editar(f, { activo: !f.activo })} aria-label={`${f.activo ? 'Desactivar' : 'Activar'} ${f.nombre}`} title={f.activo ? 'Desactivar' : 'Activar'}><Power size={14} aria-hidden="true" /></button>
              </span>
            )}
          </li>
        ))}
        {filas.length === 0 && <li className="texto-suave">Sin registros.</li>}
      </ul>
      {gestiona && (
        <form className="codif-agregar" onSubmit={agregar}>
          <input className="input codif-agregar__letra" aria-label={`Letra de la nueva ${titulo.toLowerCase()}`} placeholder="L" maxLength={1} required
            value={nueva.letra} onChange={e => setNueva({ ...nueva, letra: e.target.value.toUpperCase() })} />
          <input className="input" aria-label={`Nombre de la nueva ${titulo.toLowerCase()}`} placeholder="Nombre" maxLength={60} required
            value={nueva.nombre} onChange={e => setNueva({ ...nueva, nombre: e.target.value })} />
          <button type="submit" className="btn btn--secundario btn--sm"><Plus size={14} aria-hidden="true" /> Agregar</button>
        </form>
      )}
    </div>
  )
}

export default function PestanaCodificacion() {
  const gestiona = usePuede()('configuracion:gestionar')
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const { datos, error, recargar } = useLista('/api/codificacion')
  const [cargando, setCargando] = useState(false)
  const conLetra = (datos || []).filter(c => c.letra)
  const sinLetra = (datos || []).filter(c => !c.letra && c.activo)

  const cargarArbol = async () => {
    const ok = await confirmar({
      titulo: 'Cargar el árbol de codificación',
      mensaje: 'Crea las 12 categorías con sus letras (R Ropa, Z Calzado, T Textiles del hogar…), subcategorías y variantes. Las categorías actuales pasan a la nueva (Textiles → Ropa, Hogar → Cocina y menaje, Aseo no perecedero → Higiene personal, Papelería → Escolar y papelería, Juguetes → Juguetes y recreación). Solo crea lo que falte.',
      textoConfirmar: 'Cargar'
    })
    if (!ok) return
    setCargando(true)
    try {
      const r = await pedirJSON('/api/codificacion/arbol-inicial', { method: 'POST', body: {} })
      avisar(`Árbol cargado: ${r.categorias.length} categoría(s), ${r.subcategorias} subcategoría(s) y ${r.variantes} variante(s).`)
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setCargando(false)
    }
  }

  const editarCategoria = async (c) => {
    const letra = await confirmar({ titulo: `Letra de ${c.nombre}`, mensaje: 'Una letra (A–Z) que no use otra categoría. No se cambia si ya hay productos codificados.', textoConfirmar: 'Guardar', campo: { etiqueta: 'Letra (nivel 1)', valorInicial: c.letra || '' } })
    if (letra === null || letra === undefined || letra === false) return
    const variante = await confirmar({ titulo: `Nivel 3 de ${c.nombre}`, mensaje: 'Qué distingue el tercer carácter: Público, Tamaño, Presentación, Material…', textoConfirmar: 'Guardar', campo: { etiqueta: 'Nombre del nivel 3', valorInicial: c.nombre_variante || '' } })
    if (variante === null || variante === undefined || variante === false) return
    try {
      await pedirJSON(`/api/codificacion/categorias/${c.id}`, { method: 'PATCH', body: { letra, nombre_variante: variante } })
      avisar(`${c.nombre} actualizada.`)
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  return (
    <Card titulo="Codificación de productos" icono={Barcode}
      subtitulo="Formato 001-RCM-B: consecutivo, categoría, subcategoría, nivel 3 y estado (P perfecto, B bueno, D deterioro, X dañado). El sistema asigna el consecutivo."
      acciones={gestiona && conLetra.length === 0 && datos && (
        <button className="btn btn--primario" onClick={cargarArbol} disabled={cargando}><Wand2 size={16} aria-hidden="true" /> {cargando ? 'Cargando…' : 'Cargar árbol propuesto'}</button>
      )}>
      <ErrorState mensaje={error} onReintentar={recargar} />
      {!datos && !error && <SkeletonTabla filas={4} columnas={3} />}
      {datos && conLetra.length === 0 && (
        <p className="aviso-info" style={{ marginBottom: 12 }}>Aún no hay categorías codificadas: mientras tanto los códigos son libres (p. ej. ROP-001).{gestiona ? ' Cargue el árbol propuesto para empezar.' : ''}</p>
      )}
      <div className="codif-categorias">
        {conLetra.map(c => (
          <details key={c.id} className="codif-categoria">
            <summary>
              <span className="codif-letra codif-letra--grande">{c.letra}</span>
              <span className="codif-categoria__nombre">{c.nombre}</span>
              <span className="texto-suave texto-sm">{c.subcategorias.length} subcategorías · nivel 3: {c.nombre_variante || '—'}</span>
              {!c.activo && <Badge tono="gris">Inactiva</Badge>}
              {gestiona && <button type="button" className="btn btn--fantasma btn--sm codif-categoria__editar" onClick={(e) => { e.preventDefault(); editarCategoria(c) }}><Pencil size={14} aria-hidden="true" /> Editar</button>}
            </summary>
            <div className="codif-niveles">
              <Nivel titulo="Subcategorías" tipo="subcategorias" categoria={c} filas={c.subcategorias} gestiona={gestiona} onCambio={recargar} />
              <Nivel titulo={c.nombre_variante || 'Variantes'} tipo="variantes" categoria={c} filas={c.variantes} gestiona={gestiona} onCambio={recargar} />
            </div>
          </details>
        ))}
      </div>
      {sinLetra.length > 0 && conLetra.length > 0 && (
        <p className="texto-suave texto-sm" style={{ marginTop: 12 }}>
          Sin codificar (código libre): {sinLetra.map(c => c.nombre).join(', ')}.
          {gestiona && <> <button type="button" className="btn btn--fantasma btn--sm" onClick={() => editarCategoria(sinLetra[0])}>Asignar letra a {sinLetra[0].nombre}</button></>}
        </p>
      )}
    </Card>
  )
}
