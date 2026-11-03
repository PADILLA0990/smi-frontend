import { formatearNumero } from '../../lib/formato'
import { LARGO_HUECO, maxHuecos, cajaRack } from '../../lib/plano'

const MARGEN = 1

// Vista de planta de una zona: racks (clic: lleva a su detalle), áreas (clic: elige la ubicación),
// entradas, puertas, calles, PC y pasos. Los racks con producto se rellenan; los que coinciden con la búsqueda se resaltan.
export default function PlanoZona({ zona, seleccion, resaltados, onRack, onArea }) {
  const racks = zona.estanterias.filter(e => e.plano)
  const cajas = [...racks.map(cajaRack), ...zona.plano]
  if (cajas.length === 0) return null
  const ancho = Math.max(...cajas.map(c => c.x + c.ancho)) + MARGEN
  const alto = Math.max(...cajas.map(c => c.y + c.alto)) + MARGEN
  const sinPlano = zona.estanterias.filter(e => !e.plano)

  return (
    <figure className="plano">
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`Plano de la ${zona.nombre}`} className="plano__svg">
        <defs>
          <pattern id={`rayado-${zona.zona}`} width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="0.6" className="plano__raya" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={ancho} height={alto} className="plano__fondo" />

        {zona.plano.filter(el => el.tipo === 'PASO').map(el => (
          <g key={el.id}>
            <rect x={el.x} y={el.y} width={el.ancho} height={el.alto} fill={`url(#rayado-${zona.zona})`} className="plano__paso" />
            <text x={el.x + el.ancho / 2} y={el.y + el.alto / 2} className="plano__texto plano__texto--suave">{el.etiqueta}</text>
          </g>
        ))}

        {zona.plano.filter(el => el.tipo === 'AREA').map(el => {
          const elegida = el.ubicacion && seleccion === el.ubicacion
          const resaltada = el.ubicacion && resaltados.has(el.ubicacion)
          const clases = ['plano__area', el.unidades ? 'plano__area--ocupada' : '', elegida ? 'plano__elegido' : '', resaltada ? 'plano__resaltado' : ''].join(' ')
          const contenido = (
            <>
              <rect x={el.x} y={el.y} width={el.ancho} height={el.alto} rx="0.3" className={clases} />
              <text x={el.x + el.ancho / 2} y={el.y + el.alto / 2 - (el.ubicacion ? 0.4 : 0)} className="plano__texto">{el.etiqueta}</text>
              {el.ubicacion && <text x={el.x + el.ancho / 2} y={el.y + el.alto / 2 + 0.6} className="plano__texto plano__texto--suave">{el.unidades ? `${formatearNumero(el.unidades)} u.` : 'Vacía'}</text>}
            </>
          )
          return el.ubicacion
            ? (
              <g key={el.id} className="plano__clic" role="button" tabIndex={0} aria-label={`${el.etiqueta}: ${el.unidades ? `${el.unidades} unidades` : 'vacía'}`}
                onClick={() => onArea(el.ubicacion)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onArea(el.ubicacion))}>
                <title>{el.etiqueta}</title>
                {contenido}
              </g>
            )
            : <g key={el.id}>{contenido}</g>
        })}

        {racks.map(e => {
          const c = cajaRack(e)
          const ocupados = e.celdas.filter(x => x.productos.length > 0).length
          const unidades = e.celdas.reduce((s, x) => s + x.unidades, 0)
          const elegido = e.celdas.some(x => x.codigo === seleccion)
          const resaltado = e.celdas.some(x => resaltados.has(x.codigo))
          const n = maxHuecos(e)
          const clases = ['plano__rack', ocupados ? 'plano__rack--ocupado' : '', elegido ? 'plano__elegido' : '', resaltado ? 'plano__resaltado' : ''].join(' ')
          const vertical = e.plano.vertical
          return (
            <g key={e.id} className="plano__clic" role="button" tabIndex={0}
              aria-label={`Rack ${e.rack}: ${ocupados} de ${e.celdas.length} huecos con producto`}
              onClick={() => onRack(e)} onKeyDown={ev => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), onRack(e))}>
              <title>{`Rack ${e.rack}${e.calle ? ` · calle ${e.calle}` : ''}: ${ocupados} de ${e.celdas.length} huecos con producto${unidades ? ` · ${unidades} u.` : ''}`}</title>
              <rect x={c.x} y={c.y} width={c.ancho} height={c.alto} className={clases} />
              {Array.from({ length: n - 1 }, (_, i) => {
                const d = (i + 1) * LARGO_HUECO
                return vertical
                  ? <line key={i} x1={c.x} x2={c.x + c.ancho} y1={c.y + d} y2={c.y + d} className="plano__division" />
                  : <line key={i} y1={c.y} y2={c.y + c.alto} x1={c.x + d} x2={c.x + d} className="plano__division" />
              })}
              <circle cx={c.x + c.ancho / 2} cy={c.y + c.alto / 2} r="0.75" className="plano__letra-fondo" />
              <text x={c.x + c.ancho / 2} y={c.y + c.alto / 2} className="plano__letra">{e.rack}</text>
            </g>
          )
        })}

        {zona.plano.filter(el => el.tipo === 'ENTRADA' || el.tipo === 'PUERTA').map(el => {
          const vertical = el.alto > el.ancho
          const cx = el.x + el.ancho / 2
          const cy = el.y + el.alto / 2
          // La etiqueta va al lado: debajo de una entrada horizontal, a la izquierda (girada) de una vertical
          return (
            <g key={el.id}>
              <rect x={el.x} y={el.y} width={el.ancho} height={el.alto} className={el.tipo === 'ENTRADA' ? 'plano__entrada' : 'plano__puerta'} />
              <text x={vertical ? el.x - 0.6 : cx} y={vertical ? cy : el.y + el.alto + 0.75}
                transform={vertical ? `rotate(-90 ${el.x - 0.6} ${cy})` : undefined} className="plano__texto plano__texto--chico">{el.etiqueta}</text>
            </g>
          )
        })}

        {zona.plano.filter(el => el.tipo === 'PC').map(el => (
          <g key={el.id}>
            <rect x={el.x} y={el.y} width={el.ancho} height={el.alto} rx="0.2" className="plano__pc" />
            <text x={el.x + el.ancho / 2} y={el.y + el.alto / 2} className="plano__texto plano__texto--claro">{el.etiqueta}</text>
          </g>
        ))}

        {zona.plano.filter(el => el.tipo === 'CALLE').map(el => (
          <text key={el.id} x={el.x + el.ancho / 2} y={el.y + el.alto / 2} className="plano__calle">{el.etiqueta}</text>
        ))}
      </svg>
      <figcaption className="plano__leyenda">
        <span><i className="plano-muestra plano-muestra--rack" /> Rack (clic para ver sus huecos)</span>
        <span><i className="plano-muestra plano-muestra--ocupado" /> Con producto</span>
        <span><i className="plano-muestra plano-muestra--area" /> Área</span>
        <span><i className="plano-muestra plano-muestra--entrada" /> Entrada</span>
        <span><i className="plano-muestra plano-muestra--puerta" /> Puerta</span>
        {sinPlano.length > 0 && <span className="texto-suave">Sin posición en el plano: {sinPlano.map(e => e.rack).join(', ')}</span>}
      </figcaption>
    </figure>
  )
}
