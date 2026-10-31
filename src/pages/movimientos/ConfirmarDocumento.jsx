import { ClipboardCheck } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { formatearNumero } from '../../lib/formato'
import { unidadDe, unidadesDe } from '../../lib/documentos'

// Resumen antes de guardar: datos del documento y cada línea con sus unidades
export default function ConfirmarDocumento({ titulo, datos, lineas, unidades, textoConfirmar, peligro, guardando, onConfirmar, onCerrar }) {
  const total = lineas.reduce((s, l) => s + unidadesDe(l, unidades), 0)
  return (
    <Modal titulo={titulo} icono={ClipboardCheck} onCerrar={onCerrar} ancho
      acciones={<>
        <button type="button" className="btn btn--secundario" onClick={onCerrar} disabled={guardando}>Revisar</button>
        <button type="button" className={`btn ${peligro ? 'btn--peligro' : 'btn--exito'}`} onClick={onConfirmar} disabled={guardando} data-autofoco>
          {guardando ? 'Guardando…' : textoConfirmar}
        </button>
      </>}>
      <dl className="ficha">
        {datos.filter(([, valor]) => valor).map(([etiqueta, valor]) => <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}
      </dl>
      <div className="tabla-scroll kardex">
        <table className="tabla">
          <thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th><th className="num">Unidades</th></tr></thead>
          <tbody>
            {lineas.map(l => {
              const unidad = unidadDe(unidades, l.unidadId)
              return (
                <tr key={l.clave}>
                  <td className="texto-codigo">{l.codigo} {l.nuevo && <Badge tono="verde">Nuevo</Badge>}</td>
                  <td>{l.nuevo?.descripcion || l.producto?.descripcion}</td>
                  <td className="texto-suave">{formatearNumero(Number(l.cantidad))} {unidad.nombre}{unidad.factor > 1 ? ` × ${formatearNumero(unidad.factor)}` : ''}</td>
                  <td className="num"><strong>{formatearNumero(unidadesDe(l, unidades))}</strong></td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr><td colSpan={3}><strong>Total</strong></td><td className="num"><strong>{formatearNumero(total)}</strong></td></tr></tfoot>
        </table>
      </div>
      <p className="texto-suave texto-sm">La fecha del documento será la de este momento. Una vez registrado no se puede editar.</p>
    </Modal>
  )
}
