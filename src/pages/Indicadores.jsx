import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, Download, Info, AlertTriangle } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList } from 'recharts'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTabla } from '../components/ui/Skeleton'
import { formatearNumero } from '../lib/formato'
import { aCSV, descargarArchivo } from '../lib/novedades'

// Paleta categórica validada (dataviz, superficie blanca): orden fijo, nunca rotada.
// Dos tonos quedan bajo 3:1 de contraste: por eso cada gráfico lleva leyenda y la tabla de datos.
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100']
const TINTA = '#1b2a4a'
const TINTA_SUAVE = '#5b6475'
const REJILLA = '#e6e9ef'
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
// Indicadores de categorías ordenadas (columnas verticales); el resto son barras horizontales
const COLUMNAS = ['lotes', 'antiguedad', 'cumplimiento']
// Columnas extra de la tabla según el indicador
const EXTRAS = {
  'sin-movimiento': [['descripcion', 'Descripción'], ['categoria', 'Categoría'], ['unidades', 'Unidades']],
  'tiempo-alistamiento': [['sbo', 'SBO']],
  antiguedad: [['productos', 'Productos']]
}

const hoy = new Date()
const ANIOS = [hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2]
const ejeNumero = { tick: { fill: TINTA_SUAVE, fontSize: 12 }, tickFormatter: (v) => formatearNumero(v), axisLine: false, tickLine: false, allowDecimals: false }
const ejeTexto = { tick: { fill: TINTA, fontSize: 12 }, axisLine: { stroke: REJILLA }, tickLine: false }

function Grafico({ r }) {
  const varias = r.series.length > 1
  const formato = (v) => `${formatearNumero(v)}${r.unidad ? ` ${r.unidad}` : ''}`
  const tooltip = <Tooltip formatter={(v, nombre) => [formato(v), nombre]} cursor={{ fill: 'rgba(27,42,74,.06)' }} contentStyle={{ borderRadius: 6, borderColor: REJILLA, fontSize: 13 }} />

  if (r.tipo === 'lineas') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={r.datos} margin={{ top: 16, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid stroke={REJILLA} vertical={false} />
          <XAxis dataKey="etiqueta" {...ejeTexto} />
          <YAxis {...ejeNumero} width={56} />
          <Tooltip formatter={(v, n) => [formato(v), n]} contentStyle={{ borderRadius: 6, borderColor: REJILLA, fontSize: 13 }} />
          {r.series.map((s, i) => <Line key={s.clave} type="linear" dataKey={s.clave} name={s.nombre} stroke={SERIES[i]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: SERIES[i] }} activeDot={{ r: 6 }} />)}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (COLUMNAS.includes(r.id)) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={r.datos} margin={{ top: 24, right: 16, left: 8, bottom: 4 }} barCategoryGap="30%">
          <CartesianGrid stroke={REJILLA} vertical={false} />
          <XAxis dataKey="etiqueta" {...ejeTexto} />
          <YAxis {...ejeNumero} width={56} />
          {tooltip}
          {r.series.map((s, i) => (
            <Bar key={s.clave} dataKey={s.clave} name={s.nombre} fill={SERIES[i]} radius={[4, 4, 0, 0]} maxBarSize={72}>
              <LabelList dataKey={s.clave} position="top" formatter={formatearNumero} fill={TINTA} fontSize={12} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Barras horizontales: etiquetas largas (personas, categorías, organizaciones)
  const anchoEtiqueta = Math.min(220, Math.max(80, ...r.datos.map(d => String(d.etiqueta).length * 7)))
  const ultima = r.series.length - 1
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, r.datos.length * 38 + (varias ? 70 : 40))}>
      <BarChart data={r.datos} layout="vertical" margin={{ top: 8, right: 48, left: 8, bottom: 4 }} barCategoryGap="25%">
        <CartesianGrid stroke={REJILLA} horizontal={false} />
        <XAxis type="number" {...ejeNumero} />
        <YAxis type="category" dataKey="etiqueta" width={anchoEtiqueta} {...ejeTexto} />
        {tooltip}
        {r.referencia && <ReferenceLine x={r.referencia.valor} stroke={TINTA_SUAVE} strokeDasharray="4 4" label={{ value: r.referencia.nombre, position: 'top', fill: TINTA_SUAVE, fontSize: 12 }} />}
        {r.series.map((s, i) => (
          <Bar key={s.clave} dataKey={s.clave} name={s.nombre} fill={SERIES[i]} stackId={r.apilado ? 'a' : undefined}
            stroke="#fff" strokeWidth={r.apilado ? 2 : 0} radius={!r.apilado || i === ultima ? [0, 4, 4, 0] : 0} maxBarSize={28}>
            {!r.apilado && <LabelList dataKey={s.clave} position="right" formatter={(v) => formato(v)} fill={TINTA} fontSize={12} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function Indicadores() {
  const [parametros, setParametros] = useSearchParams()
  const [catalogo, setCatalogo] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const anio = parametros.get('anio') || String(hoy.getFullYear())
  const mes = parametros.has('mes') ? parametros.get('mes') : String(hoy.getMonth() + 1)
  const id = parametros.get('id') || catalogo?.[0]?.id || ''

  const cargarCatalogo = useCallback(() => pedirJSON('/api/indicadores').then(setCatalogo).catch(e => setError(e.message)), [])
  useEffect(() => { cargarCatalogo() }, [cargarCatalogo])

  const consulta = `anio=${anio}${mes ? `&mes=${mes}` : ''}`
  const cargar = useCallback(() => {
    if (!id) return
    pedirJSON(`/api/indicadores/${id}?${consulta}`)
      .then(r => { setResultado({ ...r, clave: `${id}?${consulta}` }); setError('') })
      .catch(e => setError(e.message))
  }, [id, consulta])
  useEffect(() => { cargar() }, [cargar])

  const cambiar = (campo, valor) => {
    const nuevos = new URLSearchParams(parametros)
    nuevos.set(campo, valor)
    setParametros(nuevos, { replace: true })
  }
  const r = resultado?.clave === `${id}?${consulta}` ? resultado : null
  const grupos = (catalogo || []).reduce((g, i) => ({ ...g, [i.grupo]: [...(g[i.grupo] || []), i] }), {})

  const columnasTabla = r ? [
    { titulo: r.id === 'sin-movimiento' ? 'Producto' : r.id === 'entradas-salidas' ? 'Mes' : 'Concepto', valor: f => f.etiqueta },
    ...(EXTRAS[r.id] || []).map(([clave, titulo]) => ({ titulo, valor: f => f[clave] })),
    ...r.series.map(s => ({ titulo: `${s.nombre}${r.unidad ? ` (${r.unidad})` : ''}`, valor: f => f[s.clave], num: true }))
  ] : []
  const exportar = () => descargarArchivo(`indicador-${r.id}-${r.periodo.replace(/\s+/g, '-')}.csv`, aCSV(columnasTabla, r.datos))
  const vacio = r && (r.datos.length === 0 || r.datos.every(f => r.series.every(s => !f[s.clave])))

  return (
    <div>
      <PageHeader icono={BarChart3} titulo="Indicadores" subtitulo="Alistamiento, inventario y operación por mes o por año" />
      <ErrorState mensaje={error} onReintentar={() => { cargarCatalogo(); cargar() }} />

      <div className="indicadores">
        <aside className="indicadores__panel card" aria-label="Elegir indicador">
          <div className="indicadores__periodo">
            <label>Año
              <select className="select" value={anio} onChange={e => cambiar('anio', e.target.value)}>
                {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label>Mes
              <select className="select" value={mes} onChange={e => cambiar('mes', e.target.value)}>
                <option value="">Año completo</option>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
          </div>
          {!catalogo && !error && <SkeletonTabla filas={6} columnas={1} />}
          {Object.entries(grupos).map(([grupo, lista]) => (
            <div key={grupo} className="indicadores__grupo">
              <h3 className="etiqueta">{grupo}</h3>
              <ul>
                {lista.map(i => (
                  <li key={i.id}>
                    <button type="button" className={`indicadores__item${i.id === id ? ' activo' : ''}`} aria-current={i.id === id ? 'true' : undefined} onClick={() => cambiar('id', i.id)}>{i.titulo}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <div className="indicadores__contenido">
          {!r && !error && <Card><SkeletonTabla filas={6} columnas={3} /></Card>}
          {r && (
            <Card titulo={r.titulo} icono={BarChart3}
              subtitulo={r.fotoActual ? 'Foto de hoy (no depende del período)' : r.anual ? `Año ${anio}` : r.periodo}>
              {r.destacado && r.destacado.valor !== null && (
                <p className="indicadores__destacado"><strong>{formatearNumero(r.destacado.valor)}{r.destacado.unidad}</strong> {r.destacado.texto}</p>
              )}
              {vacio
                ? <EmptyState icono={BarChart3} titulo="Sin datos en este período" mensaje="Pruebe con otro mes o con todo el año." />
                : <>
                  {r.series.length > 1 && (
                    <ul className="leyenda" aria-label="Series">
                      {r.series.map((s, i) => <li key={s.clave}><span className="leyenda__marca" style={{ background: SERIES[i] }} aria-hidden="true" />{s.nombre}</li>)}
                    </ul>
                  )}
                  <Grafico r={r} />
                </>}

              <div className="indicadores__como">
                <Info size={16} aria-hidden="true" />
                <p><b>Cómo se calcula:</b> {r.como_se_calcula}{r.total > r.datos.length && ` Se muestran ${r.datos.length} de ${formatearNumero(r.total)}.`}</p>
              </div>

              {r.excluidos?.total > 0 && (
                <div className="aviso-alerta" role="status" style={{ marginTop: 12 }}>
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div>
                    <b>{formatearNumero(r.excluidos.total)} registro(s) excluido(s)</b> ({r.excluidos.motivo}): {r.excluidos.codigos.join(', ')}.{' '}
                    <Link className="enlace" to={r.excluidos.enlace}>Ver y corregir</Link>
                  </div>
                </div>
              )}

              {!vacio && (
                <details className="indicadores__datos">
                  <summary>Datos del gráfico ({r.datos.length})</summary>
                  <button type="button" className="btn btn--secundario btn--sm" onClick={exportar} style={{ margin: '8px 0' }}>
                    <Download size={14} aria-hidden="true" /> Exportar (Excel)
                  </button>
                  <div className="tabla-scroll">
                    <table className="tabla">
                      <thead><tr>{columnasTabla.map(c => <th key={c.titulo} className={c.num ? 'num' : undefined}>{c.titulo}</th>)}</tr></thead>
                      <tbody>
                        {r.datos.map((f, n) => (
                          <tr key={n}>{columnasTabla.map(c => <td key={c.titulo} className={c.num ? 'num' : undefined}>{c.num ? formatearNumero(c.valor(f)) : c.valor(f)}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
