import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, FilePlus2, AlertTriangle } from 'lucide-react'
import { pedirJSON } from '../../api'
import Card from '../../components/ui/Card'
import Campo from '../../components/ui/Campo'
import SelectBuscable from '../../components/ui/SelectBuscable'
import { useAvisar } from '../../lib/dialogos'
import { useLista } from '../../lib/catalogos'
import { formatearNumero } from '../../lib/formato'
import { excesosDeStock } from '../../lib/solicitudes'

const ITEM_VACIO = { codigo_producto: '', cantidad_solicitada: '' }
const FORM_VACIO = { codigo_sbo: '', beneficiario: '', fecha_requerida: '', observaciones: '', items: [ITEM_VACIO] }
const libre = (p) => p.cantidad - (p.cantidad_reservada || 0)

// Nueva solicitud SBO. El código lo asigna el sistema (SBO-0001…) si se deja vacío.
// Pedir más de lo libre se permite (queda registrada la necesidad), pero no se podrá aprobar hasta que haya stock.
export default function FormSolicitud({ productos, onCreada }) {
  const avisar = useAvisar()
  const [form, setForm] = useState(FORM_VACIO)
  const [sugerido, setSugerido] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const cargarSugerido = useCallback(() => pedirJSON('/api/solicitudes/siguiente-codigo')
    .then(r => setSugerido(r.codigo)).catch(() => setSugerido('')), [])
  useEffect(() => { cargarSugerido() }, [cargarSugerido])

  const organizaciones = useLista('/api/catalogos/organizaciones?activos=1').datos || []
  const opcionesOrganizaciones = organizaciones.map(o => ({ valor: o.nombre, etiqueta: o.localidad || o.contacto || '', detalle: o.nit ? `NIT ${o.nit}` : undefined }))
  const opcionesProductos = productos.filter(p => p.activo !== false)
    .map(p => ({ valor: p.codigo_producto, etiqueta: p.descripcion, detalle: `libre ${formatearNumero(libre(p))}` }))
  const excesos = excesosDeStock(form.items, productos)

  const actualizarItem = (index, campo, valor) => {
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === index ? { ...item, [campo]: valor } : item) }))
  }

  const crear = async (e) => {
    e.preventDefault()
    setOcupado(true)
    try {
      const data = await pedirJSON('/api/solicitudes', {
        method: 'POST',
        body: {
          ...form,
          codigo_sbo: form.codigo_sbo.trim() || undefined,
          fecha_requerida: form.fecha_requerida || null,
          items: form.items.map(item => ({ ...item, cantidad_solicitada: parseInt(item.cantidad_solicitada) }))
        }
      })
      avisar(`Solicitud ${data.codigo_sbo} creada.`)
      setForm(FORM_VACIO)
      cargarSugerido()
      onCreada(data)
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Card titulo="Nueva solicitud" icono={FilePlus2}>
      <form onSubmit={crear}>
        <div className="form-fila" style={{ marginBottom: 18 }}>
          <Campo etiqueta="Código SBO" ayuda={sugerido ? `Vacío: se asigna ${sugerido}` : 'Vacío: se asigna automáticamente'}>
            <input className="input" placeholder={sugerido || 'SBO-0001'} maxLength={40} value={form.codigo_sbo} onChange={e => setForm({ ...form, codigo_sbo: e.target.value })} />
          </Campo>
          <Campo etiqueta="Organización beneficiaria" tamano="ancho">
            <SelectBuscable
              opciones={opcionesOrganizaciones}
              valor={form.beneficiario}
              required
              placeholder="Buscar organización"
              mensajeVacio="No está en el catálogo: pida que la agreguen en Configuración"
              onChange={nombre => setForm(f => ({ ...f, beneficiario: nombre }))}
            />
          </Campo>
          <Campo etiqueta="Fecha requerida" tamano="angosto">
            <input className="input" type="date" value={form.fecha_requerida} onChange={e => setForm({ ...form, fecha_requerida: e.target.value })} style={{ minWidth: 150 }} />
          </Campo>
          <Campo etiqueta="Observaciones" tamano="completo">
            <input className="input" placeholder="Opcional" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
          </Campo>
        </div>

        <p className="etiqueta" style={{ marginBottom: 6 }}>Productos solicitados</p>
        {form.items.map((item, index) => {
          const prod = productos.find(p => p.codigo_producto === item.codigo_producto)
          return (
            <div key={index} className="form-fila" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 260px' }}>
                <SelectBuscable
                  opciones={opcionesProductos}
                  valor={item.codigo_producto}
                  required
                  placeholder="Buscar código o descripción"
                  mensajeVacio="Ese código no está en el inventario"
                  onChange={codigo => actualizarItem(index, 'codigo_producto', codigo)}
                />
                {prod && <span className="campo__ayuda">{prod.descripcion} · libre {formatearNumero(libre(prod))}</span>}
              </div>
              <div style={{ flex: '0 0 130px' }}>
                <input className="input" type="number" min="1" step="1" placeholder="Cantidad" aria-label="Cantidad solicitada"
                  value={item.cantidad_solicitada} onChange={e => actualizarItem(index, 'cantidad_solicitada', e.target.value)} required />
              </div>
              <button type="button" className="btn btn--fantasma" disabled={form.items.length === 1} aria-label="Quitar producto"
                onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>
                <Trash2 size={18} />
              </button>
            </div>
          )
        })}

        {excesos.length > 0 && (
          <div className="aviso-alerta" role="status" style={{ marginTop: 10 }}>
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              {excesos.map(x => <div key={x.codigo}><b>{x.codigo}</b>: pide {formatearNumero(x.pedido)} y hay {formatearNumero(x.libre)} libres.</div>)}
              <div className="texto-sm">Puede guardarla para registrar lo que necesita la organización, pero no se podrá aprobar hasta que haya stock libre.</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <button type="button" className="btn btn--secundario" onClick={() => setForm({ ...form, items: [...form.items, ITEM_VACIO] })}>
            <Plus size={16} aria-hidden="true" /> Agregar producto
          </button>
          <button type="submit" className="btn btn--exito" disabled={ocupado}>Crear solicitud</button>
        </div>
      </form>
    </Card>
  )
}
