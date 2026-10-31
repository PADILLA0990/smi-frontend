import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Printer, ArrowLeft } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import ErrorState from '../components/ui/ErrorState'
import { SkeletonTabla } from '../components/ui/Skeleton'
import { useOpciones } from '../lib/catalogos'
import { formatearFechaHora, formatearNumero } from '../lib/formato'
import { ORIGENES } from '../lib/documentos'
import logoBab from '../assets/logo-bab.png'

const BANCO = 'Banco de Alimentos de Bogotá'

// Comprobante de un documento de ingreso o salida, listo para imprimir o guardar en PDF (diálogo de impresión)
export default function Comprobante() {
  const { ref } = useParams()
  const navegar = useNavigate()
  const opciones = useOpciones()
  const [documento, setDocumento] = useState(null)
  const [error, setError] = useState('')

  const cargar = useCallback(() => pedirJSON(`/api/documentos/${encodeURIComponent(ref)}`)
    .then(d => { setDocumento(d); setError('') })
    .catch(e => setError(e.message)), [ref])
  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (documento) document.title = `${documento.numero} · SMI-ControlBAB`
  }, [documento])

  const ingreso = documento?.tipo === 'INGRESO'
  const total = documento ? documento.lineas.reduce((s, l) => s + l.cantidad, 0) : 0
  const firmas = ingreso
    ? [['Entrega', documento.tercero_nombre || 'Donante o proveedor'], ['Recibe', BANCO]]
    : [['Entrega', BANCO], ['Recibe', documento?.organizacion_nombre || 'Organización o persona']]

  return (
    <div>
      <div className="no-imprimir">
        <PageHeader icono={FileText} titulo="Comprobante" subtitulo="Imprímalo o guárdelo en PDF desde el diálogo de impresión"
          acciones={<>
            <button type="button" className="btn btn--secundario" onClick={() => navegar(-1)}><ArrowLeft size={16} aria-hidden="true" /> Volver</button>
            <button type="button" className="btn btn--marca" onClick={() => window.print()} disabled={!documento}><Printer size={16} aria-hidden="true" /> Imprimir o guardar PDF</button>
          </>} />
        <ErrorState mensaje={error} onReintentar={cargar} />
      </div>

      {!documento ? (!error && <Card><SkeletonTabla /></Card>) : (
        <Card>
          <article className="comprobante">
            <header className="comprobante__cabecera">
              <img src={logoBab} alt={BANCO} />
              <div>
                <h2>{ingreso ? 'Comprobante de ingreso' : 'Comprobante de salida'}</h2>
                <p className="texto-suave">{BANCO} · Inventario de no perecederos</p>
              </div>
              <div className="comprobante__numero">
                <span className="texto-codigo">{documento.numero}</span>
                <span className="texto-suave texto-sm">{formatearFechaHora(documento.fecha)}</span>
              </div>
            </header>

            <dl className="ficha">
              {(ingreso
                ? [['Origen', ORIGENES[documento.origen]], [documento.origen === 'COMPRA' ? 'Proveedor' : 'Donante', documento.tercero_nombre || 'Sin especificar'], ['Documento soporte', documento.soporte || '—']]
                : [['Motivo', documento.motivo_nombre], ['Destino', documento.organizacion_nombre || 'Sin especificar']]
              ).concat([['Registró', documento.operario]]).map(([etiqueta, valor]) => <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}
            </dl>
            {documento.observaciones && <p><strong>Observaciones:</strong> {documento.observaciones}</p>}

            <table className="tabla comprobante__tabla">
              <thead>
                <tr><th>#</th><th>Código</th><th>Descripción</th><th>Condición</th><th>Cantidad</th><th className="num">Unidades</th></tr>
              </thead>
              <tbody>
                {documento.lineas.map((l, i) => (
                  <tr key={l.id}>
                    <td>{i + 1}</td>
                    <td className="texto-codigo">{l.codigo_producto}{l.producto_nuevo && <> <Badge tono="verde">Nuevo</Badge></>}</td>
                    <td>{l.descripcion}</td>
                    <td>{l.condicion ? opciones.condiciones[l.condicion] : '—'}</td>
                    <td>{formatearNumero(l.cantidad_manejo)} {l.unidad}{l.factor > 1 ? ` × ${formatearNumero(l.factor)}` : ''}</td>
                    <td className="num"><strong>{formatearNumero(l.cantidad)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={5}><strong>Total ({formatearNumero(documento.lineas.length)} {documento.lineas.length === 1 ? 'línea' : 'líneas'})</strong></td><td className="num"><strong>{formatearNumero(total)}</strong></td></tr>
              </tfoot>
            </table>

            <div className="comprobante__firmas">
              {firmas.map(([rol, quien]) => (
                <div key={rol} className="comprobante__firma">
                  <div className="comprobante__raya" />
                  <strong>{rol}</strong>
                  <span>{quien}</span>
                  <span className="texto-suave texto-sm">Nombre y documento: ____________________</span>
                </div>
              ))}
            </div>
          </article>
        </Card>
      )}
    </div>
  )
}
