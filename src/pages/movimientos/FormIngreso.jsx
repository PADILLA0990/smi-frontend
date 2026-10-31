import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackagePlus } from 'lucide-react'
import { pedirJSON } from '../../api'
import Card from '../../components/ui/Card'
import Campo from '../../components/ui/Campo'
import { useAvisar } from '../../lib/dialogos'
import { useLista } from '../../lib/catalogos'
import { formatearNumero } from '../../lib/formato'
import { lineaVacia, resumenLineas, problemasLineas, cuerpoLineas, ORIGENES, TERCEROS_DE } from '../../lib/documentos'
import LineasDocumento from './LineasDocumento'
import ModalProductoNuevo from './ModalProductoNuevo'
import ConfirmarDocumento from './ConfirmarDocumento'

const CABECERA_VACIA = { origen: 'DONACION', terceroId: '', soporte: '', observaciones: '' }

// Documento de ingreso: varias líneas (productos existentes o nuevos) que se registran juntas
export default function FormIngreso({ productos, unidades, categorias, ubicaciones, opciones, onGuardado }) {
  const avisar = useAvisar()
  const navegar = useNavigate()
  const terceros = useLista('/api/catalogos/terceros?activos=1').datos || []
  const [cabecera, setCabecera] = useState(CABECERA_VACIA)
  const [lineas, setLineas] = useState(() => [lineaVacia()])
  const [productoNuevo, setProductoNuevo] = useState(null) // { base, clave } mientras la ventana está abierta
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campos) => setCabecera(c => ({ ...c, ...campos }))
  const tercerosOrigen = terceros.filter(t => TERCEROS_DE[cabecera.origen].includes(t.tipo))
  const tercero = terceros.find(t => String(t.id) === String(cabecera.terceroId))
  const resumen = resumenLineas(lineas, unidades)
  const usados = [...productos.map(p => p.codigo_producto), ...lineas.filter(l => l.nuevo).map(l => l.codigo)]
  const conCodigo = lineas.filter(l => l.codigo.trim())

  // El producto nuevo reemplaza la línea de "otra condición" o una línea vacía; si no, se agrega al final
  const agregarNuevo = (codigo, nuevo) => {
    setLineas(ls => {
      const destino = productoNuevo.clave ?? ls.find(l => !l.codigo.trim())?.clave
      return destino !== undefined
        ? ls.map(l => (l.clave === destino ? { ...l, codigo, producto: null, nuevo } : l))
        : [...ls, { ...lineaVacia(), codigo, nuevo }]
    })
    setProductoNuevo(null)
  }

  const revisar = (e) => {
    e.preventDefault()
    const problemas = problemasLineas(lineas, unidades)
    if (problemas.length > 0) return avisar(problemas[0], 'error')
    setConfirmando(true)
  }

  const registrar = async () => {
    setGuardando(true)
    try {
      const documento = await pedirJSON('/api/documentos/ingreso', {
        method: 'POST',
        body: {
          origen: cabecera.origen, terceroId: cabecera.terceroId ? Number(cabecera.terceroId) : null,
          soporte: cabecera.soporte, observaciones: cabecera.observaciones, lineas: cuerpoLineas(lineas)
        }
      })
      avisar(`Ingreso ${documento.numero} registrado: ${formatearNumero(documento.lineas.reduce((s, l) => s + l.cantidad, 0))} unidades.`)
      setCabecera(CABECERA_VACIA)
      setLineas([lineaVacia()])
      onGuardado()
      navegar(`/documentos/${documento.id}`)
    } catch (err) {
      setConfirmando(false)
      avisar(err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card titulo="Documento de ingreso" icono={PackagePlus} subtitulo="Agregue una línea por producto. Si un artículo llega en otra condición, regístrelo con otro código.">
      <form onSubmit={revisar}>
        <div className="form-fila">
          <Campo etiqueta="Origen">
            <select className="select" value={cabecera.origen} onChange={e => cambiar({ origen: e.target.value, terceroId: '' })} required>
              {Object.entries(ORIGENES).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={cabecera.origen === 'COMPRA' ? 'Proveedor' : 'Donante'} ayuda={tercerosOrigen.length === 0 ? 'Se registran en Configuración › Donantes y proveedores.' : undefined}>
            <select className="select" value={cabecera.terceroId} onChange={e => cambiar({ terceroId: e.target.value })}>
              <option value="">Sin especificar</option>
              {tercerosOrigen.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.nit ? ` · NIT ${t.nit}` : ''}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Documento soporte">
            <input className="input" placeholder="Remisión, factura o acta" maxLength={60} value={cabecera.soporte} onChange={e => cambiar({ soporte: e.target.value })} />
          </Campo>
          <Campo etiqueta="Observaciones" tamano="completo">
            <textarea className="input" rows={2} maxLength={500} placeholder="Opcional" value={cabecera.observaciones} onChange={e => cambiar({ observaciones: e.target.value })} />
          </Campo>
        </div>

        <h3 className="subtitulo">Productos</h3>
        <LineasDocumento lineas={lineas} setLineas={setLineas} productos={productos} unidades={unidades} condiciones={opciones.condiciones}
          onNuevo={(base, clave) => setProductoNuevo({ base, clave })} />

        <div className="documento__pie">
          <span className="resumen-filtro">{formatearNumero(resumen.lineas)} {resumen.lineas === 1 ? 'línea' : 'líneas'} · {formatearNumero(resumen.unidades)} unidades</span>
          <button type="submit" className="btn btn--exito">Revisar y registrar</button>
        </div>
      </form>

      {productoNuevo && (
        <ModalProductoNuevo base={productoNuevo.base} usados={usados} categorias={categorias} ubicaciones={ubicaciones} opciones={opciones}
          onGuardar={agregarNuevo} onCerrar={() => setProductoNuevo(null)} />
      )}
      {confirmando && (
        <ConfirmarDocumento titulo="Confirmar ingreso" textoConfirmar="Registrar ingreso" guardando={guardando}
          datos={[['Origen', ORIGENES[cabecera.origen]], [cabecera.origen === 'COMPRA' ? 'Proveedor' : 'Donante', tercero?.nombre], ['Soporte', cabecera.soporte.trim()], ['Observaciones', cabecera.observaciones.trim()]]}
          lineas={conCodigo} unidades={unidades} onConfirmar={registrar} onCerrar={() => setConfirmando(false)} />
      )}
    </Card>
  )
}
