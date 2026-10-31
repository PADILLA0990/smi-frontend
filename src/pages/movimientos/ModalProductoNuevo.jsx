import { useState } from 'react'
import { PackagePlus, Wand2 } from 'lucide-react'
import { pedirJSON } from '../../api'
import Modal from '../../components/ui/Modal'
import Campo from '../../components/ui/Campo'
import { useAvisar } from '../../lib/dialogos'
import { codigoLibre } from '../../lib/documentos'

// Datos del producto que se crea con el ingreso, sin salir del documento.
// base: producto existente del que se copian los datos (otra condición del mismo artículo: va en otro código).
// usados: códigos ya tomados (inventario y otras líneas nuevas del documento).
export default function ModalProductoNuevo({ base, usados, categorias, ubicaciones, opciones, onGuardar, onCerrar }) {
  const avisar = useAvisar()
  const [form, setForm] = useState(() => ({
    codigo: '', descripcion: base?.descripcion || '', categoriaId: base?.categoriaId ? String(base.categoriaId) : '',
    condicion: '', talla: base?.talla || '', grupo: base?.grupo || '', stock_minimo: base?.stock_minimo ?? '', ubicacion_general: 'Recepción'
  }))
  const cambiar = (campos) => setForm(f => ({ ...f, ...campos }))
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
    cambiar({ categoriaId })
    if (categoriaId && !form.codigo.trim()) sugerirCodigo(categoriaId)
  }

  const guardar = (e) => {
    e.preventDefault()
    if (repetido) return
    onGuardar(form.codigo.trim(), {
      descripcion: form.descripcion.trim(), categoriaId: Number(form.categoriaId), condicion: form.condicion,
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
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.prefijo ? ` (${c.prefijo})` : ''}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Código" aviso={repetido ? 'Ese código ya existe o ya está en el documento.' : undefined}>
          <div className="campo-con-boton">
            <input className="input" placeholder="Ej: ROP-006" maxLength={40} value={form.codigo} onChange={e => cambiar({ codigo: e.target.value })} required />
            <button type="button" className="btn btn--secundario" onClick={() => sugerirCodigo()} disabled={!form.categoriaId}
              title="Sugerir el siguiente código de la categoría" aria-label="Sugerir código">
              <Wand2 size={16} aria-hidden="true" />
            </button>
          </div>
        </Campo>
        <Campo etiqueta="Descripción del artículo" tamano="completo">
          <input className="input" placeholder="Ej: Cobijas térmicas" maxLength={200} value={form.descripcion} onChange={e => cambiar({ descripcion: e.target.value })} required />
        </Campo>
        <Campo etiqueta="Condición">
          <select className="select" value={form.condicion} onChange={e => cambiar({ condicion: e.target.value })} required>
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
            {ubicaciones.map(u => <option key={u.id} value={u.codigo}>{u.codigo}{u.nombre ? ` · ${u.nombre}` : ''}</option>)}
          </select>
        </Campo>
      </form>
    </Modal>
  )
}
