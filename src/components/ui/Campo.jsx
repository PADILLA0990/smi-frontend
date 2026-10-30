import { useId, cloneElement, isValidElement } from 'react'

// Etiqueta + control + ayuda. Conecta label e input con un id automático.
// tamano: 'angosto' | 'ancho' | 'completo'
export default function Campo({ etiqueta, ayuda, aviso, tamano, children }) {
  const id = useId()
  const control = isValidElement(children) && !children.props.id ? cloneElement(children, { id }) : children
  const idControl = isValidElement(children) ? (children.props.id || id) : undefined
  return (
    <div className={`campo ${tamano ? `campo--${tamano}` : ''}`}>
      <label htmlFor={idControl}>{etiqueta}</label>
      {control}
      {aviso ? <span className="campo__ayuda campo__ayuda--aviso">{aviso}</span> : ayuda && <span className="campo__ayuda">{ayuda}</span>}
    </div>
  )
}
