import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, PackageCheck, Lock, Package, MapPinOff, TrendingDown, AlarmClock, Hourglass,
  BarChart3, ClipboardList, BellRing, History, Warehouse, RefreshCw, CheckCircle2, Map as MapIcon
} from 'lucide-react'
import { pedirJSON } from '../api'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { formatearNumero, formatearFechaHora, formatearHora, formatearFechaCalendario } from '../lib/formato'
import { ESTADOS_SBO, textoVencimiento } from '../lib/solicitudes'
import { TONO_ESTADO_SBO, ETIQUETA_ESTADO_SBO, tonoAccion } from '../lib/tonos'

// Indicador de volumen (unidades y productos)
function Kpi({ titulo, valor, icono: Icono, detalle }) {
  return (
    <div className="card kpi">
      <div className="kpi__icono kpi__icono--navy" aria-hidden="true"><Icono size={26} /></div>
      <div>
        <h2 className="kpi__titulo">{titulo}</h2>
        <p className="kpi__valor">{valor === null ? <Skeleton ancho={60} alto={26} /> : formatearNumero(valor)}</p>
        {detalle && <p className="kpi__detalle">{detalle}</p>}
      </div>
    </div>
  )
}

// Indicador accionable: enlaza a la lista ya filtrada. En cero se ve en verde con "Al día".
function Alerta({ titulo, valor, icono: Icono, a, tono }) {
  const cargando = valor === null
  const hay = !cargando && valor > 0
  return (
    <Link to={a} className={`card kpi kpi--enlace ${hay ? `kpi--${tono}` : ''}`}>
      <div className={`kpi__icono ${hay ? `kpi__icono--${tono}` : 'kpi__icono--ok'}`} aria-hidden="true">
        {hay || cargando ? <Icono size={26} /> : <CheckCircle2 size={26} />}
      </div>
      <div>
        <h2 className="kpi__titulo">{titulo}</h2>
        <p className="kpi__valor">{cargando ? <Skeleton ancho={40} alto={26} /> : formatearNumero(valor)}</p>
        {!cargando && <p className="kpi__detalle">{hay ? 'Ver lista →' : 'Al día'}</p>}
      </div>
    </Link>
  )
}

// Barras horizontales de una sola serie (unidades por categoría), ordenadas de mayor a menor
function BarrasCategorias({ datos }) {
  if (datos.length === 0) return <EmptyState icono={BarChart3} titulo="Sin unidades en bodega" mensaje="Cuando se registren ingresos aparecerán aquí." />
  const max = Math.max(...datos.map(d => d.unidades))
  return (
    <ul className="barras" aria-label="Unidades por categoría">
      {datos.map(d => (
        <li key={d.nombre} className="barras__fila" title={`${d.nombre}: ${formatearNumero(d.unidades)} unidades en ${formatearNumero(d.productos)} producto(s)`}>
          <span className="barras__etiqueta">{d.nombre}</span>
          <span className="barras__pista"><span className="barras__barra" style={{ width: `${Math.max(2, (d.unidades / max) * 100)}%` }} /></span>
          <span className="barras__valor">{formatearNumero(d.unidades)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Dashboard() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(() => pedirJSON('/api/dashboard')
    .then(d => { setDatos(d); setError('') })
    .catch(err => setError(err.message))
    .finally(() => setCargando(false)), [])
  useEffect(() => { cargar() }, [cargar])
  const actualizar = () => { setCargando(true); cargar() }

  const inv = datos?.inventario
  const sbo = datos?.solicitudes
  const v = (obj, campo) => (obj ? obj[campo] : null)
  const alertasSbo = sbo?.alertas || []
  const alertasProd = datos?.productos_alerta || []

  return (
    <div>
      <PageHeader icono={LayoutDashboard} titulo="Panel Principal"
        subtitulo={datos ? `Resumen del inventario · actualizado a las ${formatearHora(datos.generado)}` : 'Resumen del inventario de la bodega'}
        acciones={<button type="button" className="btn btn--secundario btn--sm" onClick={actualizar} disabled={cargando}>
          <RefreshCw size={14} aria-hidden="true" className={cargando ? 'girando' : ''} /> Actualizar
        </button>} />

      <ErrorState mensaje={error} onReintentar={actualizar} />

      <div className="kpis">
        <Kpi titulo="Unidades en bodega" valor={v(inv, 'unidades')} icono={Boxes} detalle={inv && `${formatearNumero(inv.productos)} producto(s) activo(s)`} />
        <Kpi titulo="Unidades libres" valor={v(inv, 'libres')} icono={PackageCheck} detalle="Disponibles para nuevas SBO" />
        <Kpi titulo="Unidades reservadas" valor={v(inv, 'reservadas')} icono={Lock} detalle="Apartadas por SBO aprobadas" />
        <Kpi titulo="SBO en curso" valor={v(sbo, 'activas')} icono={ClipboardList} detalle="Sin despachar" />
      </div>

      <h2 className="seccion-titulo">Requieren atención</h2>
      <div className="kpis">
        <Alerta titulo="Productos sin ubicar" valor={v(inv, 'sin_ubicar')} icono={MapPinOff} a="/inventario?sinUbicar=1" tono="ambar" />
        <Alerta titulo="Bajo stock mínimo" valor={v(inv, 'bajo_minimo')} icono={TrendingDown} a="/inventario?bajoMinimo=1" tono="ambar" />
        <Alerta titulo="SBO atrasadas" valor={v(sbo, 'atrasadas')} icono={AlarmClock} a="/solicitudes?atrasada=1" tono="rojo" />
        <Alerta titulo="SBO por vencer" valor={v(sbo, 'por_vencer')} icono={Hourglass} a="/solicitudes?porVencer=1" tono="ambar" />
      </div>

      <div className="dashboard-grid">
        <Card titulo="Unidades por categoría" icono={BarChart3} subtitulo="Productos activos con existencias">
          {datos ? <BarrasCategorias datos={datos.por_categoria} /> : <Skeleton alto={120} />}
        </Card>

        <Card titulo="Solicitudes por estado" icono={ClipboardList}
          acciones={<Link to="/solicitudes" className="btn btn--fantasma btn--sm">Ver todas</Link>}>
          {sbo ? (
            <ul className="conteo-estados">
              {ESTADOS_SBO.map(e => (
                <li key={e}>
                  <Link to={`/solicitudes?estado=${e}`} className="conteo-estados__fila">
                    <Badge tono={TONO_ESTADO_SBO[e]}>{ETIQUETA_ESTADO_SBO[e]}</Badge>
                    <span className="conteo-estados__valor">{formatearNumero(sbo.por_estado[e] || 0)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Skeleton alto={120} />}
        </Card>

        <Card titulo="Alertas" icono={BellRing} subtitulo="SBO atrasadas o por vencer y productos que piden atención">
          {!datos ? <Skeleton alto={120} /> : (alertasSbo.length + alertasProd.length === 0
            ? <EmptyState icono={CheckCircle2} titulo="Todo en orden" mensaje="No hay solicitudes atrasadas ni productos por atender." />
            : (
              <ul className="lista-alertas">
                {alertasSbo.map(s => (
                  <li key={`s${s.id}`}>
                    <Link to={`/solicitudes?codigo=${encodeURIComponent(s.codigo_sbo)}`} className="lista-alertas__fila">
                      <span><b>{s.codigo_sbo}</b> · {s.beneficiario}</span>
                      <span className="lista-alertas__insignias">
                        {s.atrasada && <Badge tono="rojo" title={s.fecha_requerida ? `Requerida para el ${formatearFechaCalendario(s.fecha_requerida)}` : undefined}>Atrasada</Badge>}
                        {s.por_vencer && <Badge tono="ambar">{textoVencimiento(s)}</Badge>}
                      </span>
                    </Link>
                  </li>
                ))}
                {alertasProd.map(p => (
                  <li key={`p${p.id}`}>
                    <Link to={`/inventario?q=${encodeURIComponent(p.codigo_producto)}`} className="lista-alertas__fila">
                      <span><b>{p.codigo_producto}</b> · {p.descripcion}</span>
                      <span className="lista-alertas__insignias">
                        {p.bajo_minimo && <Badge tono="ambar">Bajo mínimo · {formatearNumero(p.libre)} libre(s)</Badge>}
                        {p.sin_ubicar && <Badge tono="gris">Sin ubicar</Badge>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
        </Card>

        <Card titulo="Últimos movimientos" icono={History}
          acciones={<Link to="/historial" className="btn btn--fantasma btn--sm">Ver historial</Link>}>
          {!datos ? <Skeleton alto={120} /> : (datos.ultimos_movimientos.length === 0
            ? <EmptyState icono={History} titulo="Sin movimientos" mensaje="Aún no se ha registrado ningún movimiento." />
            : (
              <ul className="lista-movimientos">
                {datos.ultimos_movimientos.map(m => (
                  <li key={m.id}>
                    <Badge tono={tonoAccion(m.accion)}>{m.accion}</Badge>
                    <span className="lista-movimientos__texto"><b>{m.codigo_producto}</b>{m.detalles ? ` · ${m.detalles}` : ''}</span>
                    <span className="lista-movimientos__meta">{m.operario} · {formatearFechaHora(m.fecha)}</span>
                  </li>
                ))}
              </ul>
            ))}
        </Card>

        <Card titulo="Bodega" icono={Warehouse} className="dashboard-grid__ancho"
          subtitulo={datos && `${formatearNumero(datos.bodega.ubicaciones_ocupadas)} de ${formatearNumero(datos.bodega.ubicaciones_catalogo)} ubicaciones del catálogo con producto`}
          acciones={<Link to="/inventario-mapa" className="btn btn--secundario btn--sm"><MapIcon size={14} aria-hidden="true" /> Abrir mapa</Link>}>
          {!datos ? <Skeleton alto={60} /> : (datos.bodega.por_zona.length === 0
            ? <EmptyState icono={Package} titulo="Bodega vacía" mensaje="No hay productos con existencias." />
            : (
              <ul className="zonas">
                {datos.bodega.por_zona.map(z => (
                  <li key={z.nombre} className="zonas__item">
                    <span className="zonas__nombre">{z.nombre}</span>
                    <span className="zonas__valor">{formatearNumero(z.unidades)} <small>unidades</small></span>
                    <span className="zonas__detalle">{formatearNumero(z.productos)} producto(s)</span>
                  </li>
                ))}
              </ul>
            ))}
        </Card>
      </div>
    </div>
  )
}
