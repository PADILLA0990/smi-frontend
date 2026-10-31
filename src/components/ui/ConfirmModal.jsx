import { useId, useState } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import Modal from './Modal'

// Confirmación (y opcionalmente un campo de texto, o una lista si campo.opciones = [{ valor, etiqueta }]) antes de una acción
export default function ConfirmModal({ titulo, mensaje, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', peligro = false, campo, onConfirmar, onCancelar }) {
  const [valor, setValor] = useState(campo?.valorInicial || '')
  const idCampo = useId()
  const faltaValor = campo && !valor.trim()

  const confirmar = (e) => {
    e?.preventDefault()
    if (faltaValor) return
    onConfirmar(campo ? valor.trim() : true)
  }

  return (
    <Modal
      titulo={titulo}
      icono={peligro ? AlertTriangle : HelpCircle}
      onCerrar={onCancelar}
      acciones={<>
        <button type="button" className="btn btn--secundario" onClick={onCancelar}>{textoCancelar}</button>
        <button type="submit" form={idCampo + '-form'} className={`btn ${peligro ? 'btn--peligro' : 'btn--primario'}`} disabled={faltaValor} data-autofoco={campo ? undefined : true}>
          {textoConfirmar}
        </button>
      </>}
    >
      <form id={idCampo + '-form'} onSubmit={confirmar}>
        {mensaje && <p>{mensaje}</p>}
        {campo && (
          <div className="campo">
            <label htmlFor={idCampo}>{campo.etiqueta}</label>
            {campo.opciones ? (
              <select id={idCampo} className="select" value={valor} onChange={e => setValor(e.target.value)}>
                <option value="">{campo.placeholder || 'Seleccione…'}</option>
                {campo.opciones.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
            ) : (
              <input id={idCampo} className="input" placeholder={campo.placeholder} value={valor} onChange={e => setValor(e.target.value)} />
            )}
            {campo.ayuda && <span className="campo__ayuda">{campo.ayuda}</span>}
          </div>
        )}
      </form>
    </Modal>
  )
}
