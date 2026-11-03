import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Tags, Printer, ArrowLeft } from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Campo from '../components/ui/Campo'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTabla } from '../components/ui/Skeleton'
import { barrasCode128 } from '../lib/code128'
import { huecosDelNivel, colorZona } from '../lib/plano'

// Código de barras en SVG (Code 128). Se escala al ancho de la etiqueta.
function CodigoBarras({ texto }) {
  const { barras, total } = barrasCode128(texto)
  return (
    <svg className="etq-barras" viewBox={`0 0 ${total} 30`} preserveAspectRatio="none" role="img" aria-label={`Código de barras ${texto}`}>
      {barras.map(b => <rect key={b.x} x={b.x} y="0" width={b.ancho} height="30" />)}
    </svg>
  )
}

// Demarcación de la bodega: letreros de rack, etiquetas de nivel y etiquetas de hueco con código de barras,
// listos para imprimir. Los datos salen del Mapa de Bodega, así que siempre coinciden con Configuración → Estanterías.
export default function Demarcacion() {
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const [mapa, setMapa] = useState(null)
  const [error, setError] = useState('')
  const zonaElegida = params.get('zona') || ''
  const rackElegido = params.get('rack') || ''
  const [ver, setVer] = useState({ racks: true, niveles: true, huecos: true })

  const cargar = useCallback(() => pedirJSON('/api/mapa')
    .then(d => { setMapa(d); setError('') })
    .catch(e => setError(e.message)), [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { document.title = 'Demarcación de estanterías · SMI-ControlBAB' }, [])

  const zonas = useMemo(() => (mapa?.zonas || []).filter(z => z.estanterias.length > 0), [mapa])
  const racks = useMemo(() => zonas
    .filter(z => !zonaElegida || z.zona === zonaElegida)
    .flatMap(z => z.estanterias.map(e => ({ ...e, zona: z.zona, nombreZona: z.nombre })))
    .filter(e => !rackElegido || e.codigo === rackElegido), [zonas, zonaElegida, rackElegido])

  const filtrar = (cambio) => {
    const p = { zona: zonaElegida, rack: rackElegido, ...cambio }
    setParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v)), { replace: true })
  }
  const huecos = racks.flatMap(e => [...e.celdas].sort((a, b) => a.nivel - b.nivel || a.hueco - b.hueco).map(c => ({ ...c, rack: e })))
  const totalNiveles = racks.reduce((s, e) => s + e.niveles, 0)

  return (
    <div className="demarcacion">
      <div className="no-imprimir">
        <PageHeader icono={Tags} titulo="Demarcación de estanterías" subtitulo="Letreros y etiquetas para marcar los racks en la bodega"
          acciones={<>
            <button type="button" className="btn btn--secundario" onClick={() => navegar(-1)}><ArrowLeft size={16} aria-hidden="true" /> Volver</button>
            <button type="button" className="btn btn--marca" onClick={() => window.print()} disabled={racks.length === 0}><Printer size={16} aria-hidden="true" /> Imprimir o guardar PDF</button>
          </>} />
        <ErrorState mensaje={error} onReintentar={cargar} />

        <Card titulo="Cómo se marca la bodega">
          <ol className="demarcacion__guia">
            <li><b>Código de cada hueco:</b> <span className="texto-codigo">Z1-A-2-04</span> = Zona 1, rack A, nivel 2, hueco 4. Es el mismo código que pide el programa al ingresar, reubicar o buscar.</li>
            <li><b>Letrero del rack</b> (una hoja por rack): en la cabecera del rack que da al pasillo, a la altura de la vista o colgado arriba, para encontrarlo desde la calle. El color de la franja identifica la zona.</li>
            <li><b>Niveles</b>: se cuentan de abajo hacia arriba (1 = el más bajo). La etiqueta de nivel va en el extremo izquierdo de la viga de cada nivel.</li>
            <li><b>Huecos</b>: se cuentan de izquierda a derecha mirando el rack desde el pasillo. La etiqueta va centrada en la viga frontal, debajo del hueco (en el nivel 1, en la viga de arriba o en el piso). Del nivel 2 hacia arriba algunos racks tienen un hueco más: imprima siempre desde aquí para que coincida.</li>
            <li><b>Piso</b>: cinta amarilla en los bordes de las calles y pasillos; las mesas de alistamiento se marcan con franjas diagonales y el letrero “Zona de alistamiento: no almacenar”.</li>
            <li>Sugerencia: imprimir en papel adhesivo y proteger con cinta transparente, o usar porta-etiquetas magnéticos para cambiarlas sin despegar. Si se cambia un rack en Configuración → Estanterías, vuelva a imprimir sus etiquetas.</li>
          </ol>
        </Card>

        <Card>
          <div className="form-fila">
            <Campo etiqueta="Zona" tamano="angosto">
              <select className="select" value={zonaElegida} onChange={e => filtrar({ zona: e.target.value, rack: '' })}>
                <option value="">Todas</option>
                {zonas.map(z => <option key={z.zona} value={z.zona}>{z.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Rack" tamano="angosto">
              <select className="select" value={rackElegido} onChange={e => filtrar({ rack: e.target.value })}>
                <option value="">Todos</option>
                {zonas.filter(z => !zonaElegida || z.zona === zonaElegida).flatMap(z => z.estanterias).map(e => <option key={e.codigo} value={e.codigo}>{e.codigo}</option>)}
              </select>
            </Campo>
            <div className="campo campo--ancho" role="group" aria-labelledby="demarcacion-imprimir">
              <span id="demarcacion-imprimir" className="etiqueta">Imprimir</span>
              <div className="demarcacion__que">
              <label className="filtro-check"><input type="checkbox" checked={ver.racks} onChange={e => setVer({ ...ver, racks: e.target.checked })} /> Letreros de rack ({racks.length})</label>
              <label className="filtro-check"><input type="checkbox" checked={ver.niveles} onChange={e => setVer({ ...ver, niveles: e.target.checked })} /> Etiquetas de nivel ({totalNiveles})</label>
              <label className="filtro-check"><input type="checkbox" checked={ver.huecos} onChange={e => setVer({ ...ver, huecos: e.target.checked })} /> Etiquetas de hueco ({huecos.length})</label>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {!mapa ? (!error && <Card><SkeletonTabla /></Card>) : racks.length === 0 ? (
        <Card><EmptyState titulo="No hay estanterías" mensaje="Cree los racks en Configuración → Estanterías." /></Card>
      ) : (
        <div className="demarcacion__hojas">
          {ver.racks && racks.map(e => (
            <section key={e.codigo} className="etq-rack" style={{ '--zona': colorZona(e.zona) }} aria-label={`Letrero del rack ${e.codigo}`}>
              <div className="etq-rack__franja">{e.nombreZona}</div>
              <div className="etq-rack__letra">{e.rack}</div>
              <div className="etq-rack__codigo">{e.codigo}</div>
              {e.calle && <div className="etq-rack__calle">Calle {e.calle}</div>}
              <div className="etq-rack__detalle">
                {e.niveles} niveles · {Array.from({ length: e.niveles }, (_, i) => i + 1).map(n => `N${n}: ${huecosDelNivel(e, n)}`).join(' · ')} huecos
              </div>
            </section>
          ))}

          {ver.niveles && (
            <section className="etq-grilla etq-grilla--niveles" aria-label="Etiquetas de nivel">
              {racks.flatMap(e => Array.from({ length: e.niveles }, (_, i) => e.niveles - i).map(n => (
                <div key={`${e.codigo}-${n}`} className="etq-nivel" style={{ '--zona': colorZona(e.zona) }}>
                  <span className="etq-nivel__rack">{e.codigo}</span>
                  <span className="etq-nivel__n">NIVEL {n}</span>
                  <span className="etq-nivel__huecos">{huecosDelNivel(e, n)} huecos →</span>
                </div>
              )))}
            </section>
          )}

          {ver.huecos && (
            <section className="etq-grilla" aria-label="Etiquetas de hueco">
              {huecos.map(c => (
                <div key={c.codigo} className="etq-hueco" style={{ '--zona': colorZona(c.rack.zona) }}>
                  <div className="etq-hueco__codigo">{c.codigo}</div>
                  <CodigoBarras texto={c.codigo} />
                  <div className="etq-hueco__detalle">{c.rack.nombreZona} · Rack {c.rack.rack} · Nivel {c.nivel} · Hueco {c.hueco}</div>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
