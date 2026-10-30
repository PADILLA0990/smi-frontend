import { Inbox } from 'lucide-react'

// Estado vacío: cuando no hay datos que mostrar
export default function EmptyState({ icono: Icono = Inbox, titulo = 'No hay datos', mensaje, accion }) {
  return (
    <div className="estado-vacio">
      <Icono size={36} aria-hidden="true" />
      <p className="estado-vacio__titulo">{titulo}</p>
      {mensaje && <p className="estado-vacio__mensaje">{mensaje}</p>}
      {accion && <div className="estado-vacio__accion">{accion}</div>}
    </div>
  )
}
