import { useState } from 'react'
import { AlertCircle, Repeat, Undo2 } from 'lucide-react'
import { pedirJSON } from '../../api'
import Modal from '../../components/ui/Modal'
import Campo from '../../components/ui/Campo'
import SelectBuscable from '../../components/ui/SelectBuscable'
import { useAvisar } from '../../lib/dialogos'
import { useLista } from '../../lib/catalogos'
import { formatearNumero } from '../../lib/formato'
import { TIPOS_NOVEDAD, TIPOS_MANUALES } from '../../lib/novedades'

const MODOS = {
  novedad: { titulo: 'Registrar novedad', icono: AlertCircle, ruta: 'novedades', boton: 'Registrar' },
  sustituir: { titulo: 'Sustituir producto', icono: Repeat, ruta: 'sustituir', boton: 'Sustituir' },
  devolver: { titulo: 'Registrar devolución', icono: Undo2, ruta: 'devolver', boton: 'Registrar devolución' }
}
const libre = (p) => p.cantidad - (p.cantidad_reservada || 0)

// Novedad (faltante, dañado, talla, otro), sustitución o devolución de un ítem de la SBO.
// modo: 'novedad' | 'sustituir' | 'devolver'. Responde la solicitud actualizada a onListo.
export default function ModalNovedad({ solicitud, item, modo, productos = [], onCerrar, onListo }) {
  const avisar = useAvisar()
  const config = MODOS[modo]
  const motivos = (useLista('/api/catalogos/motivos?activos=1').datos || []).filter(m => m.tipo === 'NOVEDAD')
  const maxDevolver = item.cantidad_alistada - (item.cantidad_devuelta || 0)
  const [form, setForm] = useState({ tipo: 'FALTANTE', cantidad: modo === 'devolver' ? String(maxDevolver) : '1', descripcion: '', motivoId: '', codigo_sustituto: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const opcionesProductos = productos
    .filter(p => p.activo !== false && p.codigo_producto !== item.codigo_producto)
    .map(p => ({ valor: p.codigo_producto, etiqueta: p.descripcion, detalle: `libre ${formatearNumero(libre(p))}` }))
  const sustituto = productos.find(p => p.codigo_producto === form.codigo_sustituto)
  const sinStock = modo === 'sustituir' && sustituto && libre(sustituto) < item.cantidad_solicitada

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    const body = { itemId: item.id, descripcion: form.descripcion }
    if (modo === 'novedad') Object.assign(body, { tipo: form.tipo, cantidad: Number(form.cantidad), motivoId: form.motivoId || undefined })
    if (modo === 'sustituir') body.codigo_sustituto = form.codigo_sustituto
    if (modo === 'devolver') body.cantidad = Number(form.cantidad)
    setGuardando(true)
    try {
      const data = await pedirJSON(`/api/solicitudes/${solicitud.id}/${config.ruta}`, { method: 'POST', body })
      const nueva = data.novedades[data.novedades.length - 1]
      avisar(`${solicitud.codigo_sbo}: ${nueva ? `${nueva.codigo} · ${TIPOS_NOVEDAD[nueva.tipo]}` : 'novedad'} registrada.`)
      onListo(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`${config.titulo} · ${solicitud.codigo_sbo}`} icono={config.icono} onCerrar={onCerrar}
      acciones={<>
        <button type="button" className="btn btn--secundario" onClick={onCerrar}>Cancelar</button>
        <button type="submit" form="form-novedad" className="btn btn--primario" disabled={guardando || sinStock}>{guardando ? 'Guardando…' : config.boton}</button>
      </>}>
      <form id="form-novedad" onSubmit={guardar} className="form-fila form-modal">
        {error && <div className="estado-error campo--completo" role="alert" style={{ marginBottom: 0 }}><span>{error}</span></div>}
        <p className="campo--completo texto-sm" style={{ margin: 0 }}>
          <b className="texto-codigo">{item.codigo_producto}</b> · {item.descripcion} · solicitado {formatearNumero(item.cantidad_solicitada)}
          {modo === 'devolver' && <> · despachado {formatearNumero(item.cantidad_alistada)}{item.cantidad_devuelta > 0 && <>, ya devuelto {formatearNumero(item.cantidad_devuelta)}</>}</>}
        </p>

        {modo === 'novedad' && (<>
          <Campo etiqueta="Tipo">
            <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS_MANUALES.map(t => <option key={t} value={t}>{TIPOS_NOVEDAD[t]}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Cantidad" tamano="angosto">
            <input className="input" type="number" min="1" max={item.cantidad_solicitada} required value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
          </Campo>
          {motivos.length > 0 && (
            <Campo etiqueta="Motivo (catálogo)">
              <select className="select" value={form.motivoId} onChange={e => setForm({ ...form, motivoId: e.target.value })}>
                <option value="">Sin motivo</option>
                {motivos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </Campo>
          )}
        </>)}

        {modo === 'sustituir' && (
          <Campo etiqueta="Producto sustituto" tamano="completo"
            ayuda={sustituto ? `${sustituto.descripcion} · libre ${formatearNumero(libre(sustituto))}. Se reservan ${formatearNumero(item.cantidad_solicitada)} y se libera la reserva de ${item.codigo_producto}.` : 'Un producto equivalente con stock libre.'}
            aviso={sinStock ? `No alcanza: se necesitan ${formatearNumero(item.cantidad_solicitada)} libres.` : undefined}>
            <SelectBuscable opciones={opcionesProductos} valor={form.codigo_sustituto} required placeholder="Buscar código o descripción"
              mensajeVacio="Ese código no está en el inventario" onChange={codigo => setForm({ ...form, codigo_sustituto: codigo })} />
          </Campo>
        )}

        {modo === 'devolver' && (
          <Campo etiqueta="Unidades que vuelven al stock" tamano="angosto" ayuda={`Máximo ${formatearNumero(maxDevolver)}`}>
            <input className="input" type="number" min="1" max={maxDevolver} required value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
          </Campo>
        )}

        <Campo etiqueta="Descripción" tamano="completo">
          <textarea className="input" rows={3} minLength={5} maxLength={500} required value={form.descripcion}
            placeholder={modo === 'sustituir' ? '¿Por qué se cambia? (p. ej. no hay la talla pedida)' : modo === 'devolver' ? '¿Por qué devuelven? Estado de lo que vuelve' : '¿Qué pasó?'}
            onChange={e => setForm({ ...form, descripcion: e.target.value })} />
        </Campo>
      </form>
    </Modal>
  )
}
