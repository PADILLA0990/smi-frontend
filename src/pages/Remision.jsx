import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Truck, Printer, ArrowLeft } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import ErrorState from '../components/ui/ErrorState'
import { SkeletonTabla } from '../components/ui/Skeleton'
import { ETIQUETA_ESTADO_SBO } from '../lib/tonos'
import { formatearFechaHora, formatearFechaCalendario, formatearNumero } from '../lib/formato'
import logoBab from '../assets/logo-bab.png'

const BANCO = 'Banco de Alimentos de Bogotá'

// Remisión de una SBO, lista para imprimir o guardar en PDF, con firma de entrega y de quien recibe.
// Antes del despacho sale como borrador con las cantidades alistadas (o solicitadas).
export default function Remision() {
  const { codigo } = useParams()
  const navegar = useNavigate()
  const [s, setSolicitud] = useState(null)
  const [error, setError] = useState('')

  const cargar = useCallback(() => pedirJSON(`/api/solicitudes/codigo/${encodeURIComponent(codigo)}`)
    .then(d => { setSolicitud(d); setError('') })
    .catch(e => setError(e.message)), [codigo])
  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (s) document.title = `Remisión ${s.codigo_sbo} · SMI-ControlBAB`
  }, [s])

  const despachada = s?.estado === 'DESPACHADA'
  const alistada = s && ['ALISTADA', 'DESPACHADA'].includes(s.estado)
  const entregar = (item) => despachada ? item.cantidad_despachada : alistada ? item.cantidad_alistada : item.cantidad_solicitada
  const total = s ? s.items.reduce((t, i) => t + entregar(i), 0) : 0

  return (
    <div>
      <div className="no-imprimir">
        <PageHeader icono={Truck} titulo="Remisión" subtitulo="Imprímala o guárdela en PDF desde el diálogo de impresión"
          acciones={<>
            <button type="button" className="btn btn--secundario" onClick={() => navegar(-1)}><ArrowLeft size={16} aria-hidden="true" /> Volver</button>
            <button type="button" className="btn btn--marca" onClick={() => window.print()} disabled={!s}><Printer size={16} aria-hidden="true" /> Imprimir o guardar PDF</button>
          </>} />
        <ErrorState mensaje={error} onReintentar={cargar} />
      </div>

      {!s ? (!error && <Card><SkeletonTabla /></Card>) : (
        <Card>
          <article className="comprobante">
            <header className="comprobante__cabecera">
              <img src={logoBab} alt={BANCO} />
              <div>
                <h2>Remisión de entrega{!despachada && ' (borrador)'}</h2>
                <p className="texto-suave">{BANCO} · Inventario de no perecederos</p>
              </div>
              <div className="comprobante__numero">
                <span className="texto-codigo">{s.codigo_sbo}</span>
                <span className="texto-suave texto-sm">{despachada ? formatearFechaHora(s.fecha_despacho) : `Estado: ${ETIQUETA_ESTADO_SBO[s.estado]}`}</span>
              </div>
            </header>

            {!despachada && (
              <p className="aviso-alerta" role="status">
                Esta solicitud aún no se despacha: las cantidades son {alistada ? 'las alistadas' : 'las solicitadas'} y pueden cambiar.
              </p>
            )}

            <dl className="ficha">
              {[
                ['Organización', s.beneficiario],
                ['Fecha requerida', s.fecha_requerida ? formatearFechaCalendario(s.fecha_requerida) : '—'],
                ['Solicitó', s.creado_por],
                ['Alistó', s.alistador || '—']
              ].map(([etiqueta, valor]) => <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}
            </dl>
            {s.observaciones && <p><strong>Observaciones:</strong> {s.observaciones}</p>}

            <table className="tabla comprobante__tabla">
              <thead>
                <tr><th>#</th><th>Referencia</th><th>Descripción</th><th className="num">Solicitado</th><th className="num">{despachada ? 'Entregado' : alistada ? 'Alistado' : 'Por entregar'}</th></tr>
              </thead>
              <tbody>
                {s.items.map((item, i) => (
                  <tr key={item.id}>
                    <td>{i + 1}</td>
                    <td className="texto-codigo">{item.referencia}</td>
                    <td>{item.descripcion}</td>
                    <td className="num">{formatearNumero(item.cantidad_solicitada)}</td>
                    <td className="num"><strong>{formatearNumero(entregar(item))}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={4}><strong>Total ({formatearNumero(s.items.length)} {s.items.length === 1 ? 'línea' : 'líneas'})</strong></td><td className="num"><strong>{formatearNumero(total)}</strong></td></tr>
              </tfoot>
            </table>

            <div className="comprobante__firmas">
              {[['Entrega', BANCO], ['Recibe', s.beneficiario]].map(([rol, quien]) => (
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
