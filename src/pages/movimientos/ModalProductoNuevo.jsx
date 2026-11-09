import { useState } from 'react'
import { PackagePlus, Wand2 } from 'lucide-react'
import { pedirJSON } from '../../api'
import Modal from '../../components/ui/Modal'
import Campo from '../../components/ui/Campo'
import { useAvisar } from '../../lib/dialogos'
import { useLista } from '../../lib/catalogos'
import { codigoLibre, codigoHermano, PATRON_CODIGO } from '../../lib/documentos'

// Datos del producto que se crea con el ingreso, sin salir del documento.
// base: producto existente del que se copian los datos (otra condición del mismo artículo: va en otro código).
// usados: códigos ya tomados (inventario y otras líneas nuevas del documento).
export default function ModalProductoNuevo({ base, ubicacionInicial, usados, categorias, ubicaciones, opciones, onGuardar, onCerrar }) {
  const avisar = useAvisar()
  const arbol = useLista('/api/codificacion').datos || []
  const [form, setForm] = useState(() => ({
    subcategoriaId: base?.subcategoriaId ? String(base.subcategoriaId) : '', varianteId: base?.varianteId ? String(base.varianteId) : '',
    codigo: '', descripcion: base?.descripcion || '', categoriaId: base?.categoriaId ? String(base.categoriaId) : '',
    condicion: '', talla: base?.talla || '', grupo: base?.grupo || '', stock_minimo: base?.stock_minimo ?? '', ubicacion_general: ubicacionInicial || 'Recepción'
  }))
  const cambiar = (campos) => setForm(f => ({ ...f, ...campos }))
  // Codificación 001-RCM-B: si la categoría tiene letra, el código lo asigna el sistema
  const nodo = arbol.find(c => String(c.id) === String(form.categoriaId))
  const codificada = Boolean(nodo?.letra)
  const baseCodificada = Boolean(base && PATRON_CODIGO.test(base.codigo_producto) && base.subcategoriaId)

  // Recalcula el código al cambiar categoría, subcategoría, variante o estado
  const cambiarCodificacion = async (campos) => {
    const f = { ...form, ...campos }
    const nodoF = arbol.find(c => String(c.id) === String(f.categoriaId))
    if (!nodoF?.letra) return setForm({ ...f, codigo: campos.categoriaId !== undefined ? '' : f.codigo })
    if (baseCodificada) return setForm({ ...f, codigo: f.condicion ? codigoHermano(base.codigo_producto, f.condicion) : '' })
    setForm({ ...f, codigo: '' })
    if (!f.subcategoriaId || !f.varianteId || !f.condicion) return
    try {
      const excluir = usados.filter(u => PATRON_CODIGO.test(u)).join(',')
      const { codigo } = await pedirJSON(`/api/codificacion/siguiente?categoriaId=${f.categoriaId}&subcategoriaId=${f.subcategoriaId}&varianteId=${f.varianteId}&condicion=${f.condicion}&excluir=${encodeURIComponent(excluir)}`)
      setForm(actual => (actual.categoriaId === f.categoriaId && actual.subcategoriaId === f.subcategoriaId && actual.varianteId === f.varianteId && actual.condicion === f.condicion ? { ...actual, codigo } : actual))
    } catch (err) {
      avisar(err.message, 'error')
    }
  }
  const condiciones = Object.entries(opciones.condiciones).filter(([valor]) => !base || valor !== base.condicion)
  const repetido = form.codigo.trim() && usados.some(u => u.toLowerCase() === form.codigo.trim().toLowerCase())

  // Propone el siguiente código de la categoría (p. ej. ROP-006) sin chocar con las otras líneas nuevas
  const sugerirCodigo = async (categoriaId = form.categoriaId) => {
    if (!categoriaId) return
    try {
      const { codigo } = await pedirJSON(`/api/catalogos/categorias/${categoriaId}/siguiente-codigo`)
      if (codigo) cambiar({ codigo: codigoLibre(codigo, usados) })
      else avisar('Esa categoría no tiene prefijo: escriba el código manualmente.', 'error')
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const elegirCategoria = (categoriaId) => {
    const letra = arbol.find(c => String(c.id) === String(categoriaId))?.letra
    if (letra) return cambiarCodificacion({ categoriaId, subcategoriaId: '', varianteId: '' })
    cambiar({ categoriaId, subcategoriaId: '', varianteId: '', codigo: '' })
    if (categoriaId) sugerirCodigo(categoriaId)
  }

  const guardar = (e) => {
    e.preventDefault()
    if (repetido) return
    onGuardar(form.codigo.trim(), {
      descripcion: form.descripcion.trim(), categoriaId: Number(form.categoriaId), condicion: form.condicion,
      ...(codificada ? { subcategoriaId: Number(form.subcategoriaId), varianteId: Number(form.varianteId) } : {}),
      talla: form.talla, grupo: form.grupo || null, stock_minimo: form.stock_minimo === '' ? null : Number(form.stock_minimo),
      ubicacion_general: form.ubicacion_general
    })
  }

  return (
    <Modal titulo={base ? `Otra condición de ${base.codigo_producto}` : 'Producto nuevo'} icono={PackagePlus} onCerrar={onCerrar} ancho
      acciones={<>
        <button type="button" className="btn btn--secundario" onClick={onCerrar}>Cancelar</button>
        <button type="submit" form="form-producto-nuevo" className="btn btn--primario">Agregar al documento</button>
      </>}>
      {base && <p className="texto-suave texto-sm">Cada condición tiene su propio código. Se copian los datos de {base.codigo_producto}; elija la condición en que llegan estas unidades.</p>}
      <form id="form-producto-nuevo" className="form-fila form-modal" onSubmit={guardar}>
        <Campo etiqueta="Categoría">
          <select className="select" value={form.categoriaId} onChange={e => elegirCategoria(e.target.value)} required>
            <option value="">Seleccione…</option>
            {categorias.map(c => {
              const letra = arbol.find(n => n.id === c.id)?.letra
              return <option key={c.id} value={c.id}>{c.nombre}{letra ? ` (${letra})` : c.prefijo ? ` (${c.prefijo})` : ''}</option>
            })}
          </select>
        </Campo>
        {codificada && (
          <>
            <Campo etiqueta="Subcategoría">
              <select className="select" value={form.subcategoriaId} disabled={baseCodificada} required onChange={e => cambiarCodificacion({ subcategoriaId: e.target.value })}>
                <option value="">Seleccione…</option>
                {nodo.subcategorias.filter(x => x.activo || String(x.id) === form.subcategoriaId).map(x => <option key={x.id} value={x.id}>{x.letra} · {x.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={nodo.nombre_variante || 'Variante'}>
              <select className="select" value={form.varianteId} disabled={baseCodificada} required onChange={e => cambiarCodificacion({ varianteId: e.target.value })}>
                <option value="">Seleccione…</option>
                {nodo.variantes.filter(x => x.activo || String(x.id) === form.varianteId).map(x => <option key={x.id} value={x.id}>{x.letra} · {x.nombre}</option>)}
              </select>
            </Campo>
          </>
        )}
        {codificada ? (
          <Campo etiqueta="Código (lo asigna el sistema)" aviso={repetido ? 'Ese código ya existe o ya está en el documento.' : undefined}
            ayuda={baseCodificada ? 'Misma base que el original, con el sufijo del nuevo estado.' : 'Consecutivo · categoría, subcategoría y ' + (nodo.nombre_variante || 'variante').toLowerCase() + ' · estado (P, B, D, X).'}>
            <input className="input input--codigo" value={form.codigo} readOnly placeholder="Elija subcategoría, variante y condición" required />
          </Campo>
        ) : (
        <Campo etiqueta="Código" aviso={repetido ? 'Ese código ya existe o ya está en el documento.' : undefined}>
          <div className="campo-con-boton">
            <input className="input" placeholder="Ej: ROP-006" maxLength={40} value={form.codigo} onChange={e => cambiar({ codigo: e.target.value })} required />
            <button type="button" className="btn btn--secundario" onClick={() => sugerirCodigo()} disabled={!form.categoriaId}
              title="Sugerir el siguiente código de la categoría" aria-label="Sugerir código">
              <Wand2 size={16} aria-hidden="true" />
            </button>
          </div>
        </Campo>
        )}
        <Campo etiqueta="Descripción del artículo" tamano="completo">
          <input className="input" placeholder="Ej: Cobijas térmicas" maxLength={200} value={form.descripcion} onChange={e => cambiar({ descripcion: e.target.value })} required />
        </Campo>
        <Campo etiqueta="Condición">
          <select className="select" value={form.condicion} onChange={e => (codificada ? cambiarCodificacion({ condicion: e.target.value }) : cambiar({ condicion: e.target.value }))} required>
            <option value="">Seleccione…</option>
            {condiciones.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Talla">
          <input className="input" placeholder="Ej: M, 38" maxLength={20} value={form.talla} onChange={e => cambiar({ talla: e.target.value })} />
        </Campo>
        <Campo etiqueta="Género / grupo">
          <select className="select" value={form.grupo} onChange={e => cambiar({ grupo: e.target.value })}>
            <option value="">Sin especificar</option>
            {opciones.grupos.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Stock mínimo">
          <input className="input" type="number" min="0" step="1" placeholder="Por defecto" value={form.stock_minimo} onChange={e => cambiar({ stock_minimo: e.target.value })} />
        </Campo>
        <Campo etiqueta="Ubicación inicial">
          <select className="select" value={form.ubicacion_general} onChange={e => cambiar({ ubicacion_general: e.target.value })} required>
            {!ubicaciones.some(u => u.codigo === form.ubicacion_general) && <option value={form.ubicacion_general}>{form.ubicacion_general}</option>}
            {ubicaciones.filter(u => !u.lleno || u.codigo === form.ubicacion_general).map(u => <option key={u.id} value={u.codigo}>{u.codigo}{u.nombre ? ` · ${u.nombre}` : ''}</option>)}
          </select>
        </Campo>
      </form>
    </Modal>
  )
}
