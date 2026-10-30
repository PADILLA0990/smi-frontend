import { Settings, Wrench } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'

export default function Configuracion() {
  return (
    <div>
      <PageHeader icono={Settings} titulo="Configuración" subtitulo="Catálogos y parámetros del sistema" />
      <Card>
        <EmptyState
          icono={Wrench}
          titulo="Próximamente"
          mensaje="Aquí se administrarán las categorías, organizaciones beneficiarias, donantes, motivos, unidades de manejo, ubicaciones y parámetros de operación."
        />
      </Card>
    </div>
  )
}
