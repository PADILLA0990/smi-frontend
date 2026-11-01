import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import { useAvisar } from '../lib/dialogos'
import { usePuede } from '../lib/auth'
import { useConsultaPaginada } from '../lib/paginado'
import FormSolicitud from './solicitudes/FormSolicitud'
import DetalleSolicitud from './solicitudes/DetalleSolicitud'
import ListaSolicitudes from './solicitudes/ListaSolicitudes'
import { FILTROS_SBO_VACIOS } from '../lib/solicitudes'

// Solicitudes SBO (Fase D3): formulario, detalle y lista paginada.
// ?codigo=SBO-0001 abre directamente el detalle (enlaces desde el historial).
export default function Solicitudes() {
  const puede = usePuede()
  const avisar = useAvisar()
  const [parametrosUrl, setParametrosUrl] = useSearchParams()
  const [productos, setProductos] = useState([])
  const [alistadores, setAlistadores] = useState([])
  const [detalle, setDetalle] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_SBO_VACIOS)
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const lista = useConsultaPaginada('/api/solicitudes', { pagina, porPagina: 20, q: texto.trim(), ...filtros })

  // Solo alimenta el autocompletado y el aviso de stock libre: si falla, el formulario sigue funcionando
  const cargarProductos = useCallback(() => pedirJSON('/api/productos').then(setProductos).catch(() => setProductos([])), [])
  useEffect(() => { cargarProductos() }, [cargarProductos])

  const cargarAlistadores = useCallback(() => pedirJSON('/api/usuarios/alistadores').then(setAlistadores).catch(() => setAlistadores([])), [])
  useEffect(() => { cargarAlistadores() }, [cargarAlistadores])

  const abrir = useCallback((ruta) => pedirJSON(ruta).then(setDetalle).catch(err => avisar(err.message, 'error')), [avisar])
  const codigoUrl = parametrosUrl.get('codigo')
  useEffect(() => {
    if (codigoUrl) abrir(`/api/solicitudes/codigo/${encodeURIComponent(codigoUrl)}`)
  }, [codigoUrl, abrir])

  const cerrar = () => {
    setDetalle(null)
    if (codigoUrl) setParametrosUrl({}, { replace: true })
  }

  const alCambiar = (data) => {
    setDetalle(data)
    lista.recargar()
    cargarProductos()
  }

  return (
    <div>
      <PageHeader icono={ClipboardList} titulo="Solicitudes SBO" subtitulo="Pedidos de las organizaciones beneficiarias: aprobación, alistamiento y despacho" />

      {puede('sbo:crear') && <FormSolicitud productos={productos} onCreada={alCambiar} />}

      {detalle && (
        <DetalleSolicitud
          key={`${detalle.id}-${detalle.estado}-${detalle.eventos.length}`}
          solicitud={detalle}
          alistadores={alistadores}
          onCambio={alCambiar}
          onCerrar={cerrar}
        />
      )}

      <ListaSolicitudes
        {...lista}
        filtros={filtros} setFiltros={setFiltros}
        texto={texto} setTexto={setTexto}
        pagina={pagina} setPagina={setPagina}
        alistadores={alistadores}
        onAbrir={id => abrir(`/api/solicitudes/${id}`)}
        activa={detalle?.id}
      />
    </div>
  )
}
