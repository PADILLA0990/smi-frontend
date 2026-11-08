import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageMinus } from 'lucide-react'
import { pedirJSON } from '../../api'
import Card from '../../components/ui/Card'
import Campo from '../../components/ui/Campo'
import { useAvisar } from '../../lib/dialogos'
import { useLista } from '../../lib/catalogos'
import { formatearNumero } from '../../lib/formato'
import { lineaVacia, resumenLineas, problemasLineas, cuerpoLineas } from '../../lib/documentos'
import LineasDocumento from './LineasDocumento'
import ConfirmarDocumento from './ConfirmarDocumento'

const CABECERA_VACIA = { motivoId: '', organizacionId: '', observaciones: '' }

// Documento de salida: retira stock libre de varios productos con un mismo motivo y destino
export default function FormSalida({ productos, unidades, opciones, onGuardado }) {
  const avisar = useAvisar()
  const navegar = useNavigate()
  const motivos = useLista('/api/catalogos/motivos?activos=1&tipo=SALIDA').datos || []
  const organizaciones = useLista('/api/catalogos/organizaciones?activos=1').datos || []
  const [cabecera, setCabecera] = useState(CABECERA_VACIA)
  const [lineas, setLineas] = useState(() => [lineaVacia()])
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campos) => setCabecera(c => ({ ...c, ...campos }))
  const resumen = resumenLineas(lineas, unidades)
  const motivo = motivos.find(m => String(m.id) === String(cabecera.motivoId))
  const organizacion = organizaciones.find(o => String(o.id) === String(cabecera.organizacionId))

  const revisar = (e) => {
    e.preventDefault()
    const problemas = problemasLineas(lineas, unidades, { salida: true })
    if (problemas.length > 0) return avisar(problemas[0], 'error')
    setConfirmando(true)
  }

  const registrar = async () => {
    setGuardando(true)
    try {
      const documento = await pedirJSON('/api/documentos/salida', {
        method: 'POST',
        body: {
          motivoId: Number(cabecera.motivoId), organizacionId: cabecera.organizacionId ? Number(cabecera.organizacionId) : null,
          observaciones: cabecera.observaciones, lineas: cuerpoLineas(lineas)
        }
      })
      avisar(`Salida ${documento.numero} registrada: ${formatearNumero(documento.lineas.reduce((s, l) => s + l.cantidad, 0))} unidades.`)
      setConfirmando(false)
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
    <Card titulo="Documento de salida" icono={PackageMinus} subtitulo="Solo se puede retirar el stock libre (lo reservado por SBO aprobadas no está disponible).">
      <form onSubmit={revisar}>
        <div className="form-fila">
          <Campo etiqueta="Motivo de la salida">
            <select className="select" value={cabecera.motivoId} onChange={e => cambiar({ motivoId: e.target.value })} required>
              <option value="">Seleccione…</option>
              {motivos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Organización destino" tamano="ancho">
            <select className="select" value={cabecera.organizacionId} onChange={e => cambiar({ organizacionId: e.target.value })}>
              <option value="">Sin especificar</option>
              {organizaciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Observaciones" tamano="completo">
            <textarea className="input" rows={2} maxLength={500} placeholder="Opcional. Ej: entrega acta 123" value={cabecera.observaciones} onChange={e => cambiar({ observaciones: e.target.value })} />
          </Campo>
        </div>

        <h3 className="subtitulo">Productos</h3>
        <LineasDocumento lineas={lineas} setLineas={setLineas} productos={productos} unidades={unidades} condiciones={opciones.condiciones} salida />

        <div className="documento__pie">
          <span className="resumen-filtro">{formatearNumero(resumen.lineas)} {resumen.lineas === 1 ? 'línea' : 'líneas'} · {formatearNumero(resumen.unidades)} unidades</span>
          <button type="submit" className="btn btn--peligro">Revisar y registrar</button>
        </div>
      </form>

      {confirmando && (
        <ConfirmarDocumento titulo="Confirmar salida" textoConfirmar="Registrar salida" peligro guardando={guardando}
          datos={[['Motivo', motivo?.nombre], ['Destino', organizacion?.nombre], ['Observaciones', cabecera.observaciones.trim()]]}
          lineas={lineas.filter(l => l.codigo.trim())} unidades={unidades} onConfirmar={registrar} onCerrar={() => setConfirmando(false)} />
      )}
    </Card>
  )
}
