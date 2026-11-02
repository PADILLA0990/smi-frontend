import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRightLeft, PackagePlus, PackageMinus, FileText } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import { useLista, useOpciones } from '../lib/catalogos'
import FormIngreso from './movimientos/FormIngreso'
import FormSalida from './movimientos/FormSalida'
import ListaDocumentos from './movimientos/ListaDocumentos'

const PESTANAS = [
  { id: 'ingreso', etiqueta: 'Nuevo ingreso', icono: PackagePlus },
  { id: 'salida', etiqueta: 'Nueva salida', icono: PackageMinus },
  { id: 'documentos', etiqueta: 'Documentos', icono: FileText }
]

// Ingresos y retiros como documentos de varias líneas (Fase D2)
export default function Movimientos() {
  const [params, setParams] = useSearchParams()
  const actual = PESTANAS.some(p => p.id === params.get('pestana')) ? params.get('pestana') : PESTANAS[0].id
  const [productos, setProductos] = useState([])
  const opciones = useOpciones()
  const unidades = useLista('/api/catalogos/unidades?activos=1').datos || []
  const categorias = useLista('/api/catalogos/categorias?activos=1').datos || []
  const ubicaciones = useLista('/api/ubicaciones').datos || []

  // Alimenta el autocompletado de las líneas: si falla, el formulario sigue visible y la API valida
  const cargarProductos = useCallback(() => pedirJSON('/api/productos').then(setProductos).catch(() => setProductos([])), [])
  useEffect(() => { cargarProductos() }, [cargarProductos])

  return (
    <div>
      <PageHeader icono={ArrowRightLeft} titulo="Ingresos y Retiros" subtitulo="Registre donaciones, compras y salidas de la bodega como documentos" />
      <div className="pestanas" role="tablist" aria-label="Ingresos y retiros">
        {PESTANAS.map(p => (
          <button key={p.id} role="tab" aria-selected={p.id === actual} className={`pestana ${p.id === actual ? 'pestana--activa' : ''}`}
            onClick={() => setParams({ pestana: p.id }, { replace: true })}>
            <p.icono size={16} aria-hidden="true" /> {p.etiqueta}
          </button>
        ))}
      </div>
      {/* Los formularios quedan montados (ocultos) para no perder un documento a medio llenar al cambiar de pestaña */}
      <div role="tabpanel" hidden={actual !== 'ingreso'}>
        <FormIngreso productos={productos} unidades={unidades} categorias={categorias} ubicaciones={ubicaciones} opciones={opciones} onGuardado={cargarProductos}
          ubicacionInicial={params.get('ubicacion') || ''} />
      </div>
      <div role="tabpanel" hidden={actual !== 'salida'}>
        <FormSalida productos={productos} unidades={unidades} opciones={opciones} onGuardado={cargarProductos} />
      </div>
      {actual === 'documentos' && <div role="tabpanel"><ListaDocumentos /></div>}
    </div>
  )
}
