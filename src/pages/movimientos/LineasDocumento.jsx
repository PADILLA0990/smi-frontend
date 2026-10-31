import { Plus, PackagePlus, Trash2, Copy } from 'lucide-react'
import SelectBuscable from '../../components/ui/SelectBuscable'
import Badge from '../../components/ui/Badge'
import { formatearNumero } from '../../lib/formato'
import { lineaVacia, unidadesDe, libreDe } from '../../lib/documentos'

// Tabla editable de líneas de un documento.
// salida: muestra el stock libre y avisa si la línea lo supera. onNuevo(base, clave): abre la ventana de producto nuevo.
export default function LineasDocumento({ lineas, setLineas, productos, unidades, condiciones, salida = false, onNuevo }) {
  const cambiar = (clave, campos) => setLineas(ls => ls.map(l => (l.clave === clave ? { ...l, ...campos } : l)))
  const quitar = (clave) => setLineas(ls => (ls.length === 1 ? [lineaVacia()] : ls.filter(l => l.clave !== clave)))

  // Ingreso: solo productos activos. Salida: los que tengan stock libre (los inactivos también se pueden retirar)
  const opciones = productos
    .filter(p => (salida ? libreDe(p) > 0 : p.activo !== false))
    .map(p => ({
      valor: p.codigo_producto, etiqueta: p.descripcion, producto: p,
      detalle: `${p.condicion ? condiciones[p.condicion] + ' · ' : ''}${salida ? `libre ${formatearNumero(libreDe(p))}` : `stock ${formatearNumero(p.cantidad)}`}${p.activo === false ? ' · inactivo' : ''}`
    }))

  return (
    <div>
      <div className="tabla-scroll">
        <table className="tabla tabla-lineas">
          <thead>
            <tr>
              <th>#</th><th>Producto</th><th>Condición</th><th>Unidad de manejo</th><th className="num">Cantidad</th>
              <th className="num">Unidades</th>{salida && <th className="num">Libre</th>}<th><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => {
              const total = unidadesDe(l, unidades)
              const excede = salida && l.producto && total > libreDe(l.producto)
              const condicion = l.nuevo?.condicion || l.producto?.condicion
              return (
                <tr key={l.clave}>
                  <td className="texto-suave">{i + 1}</td>
                  <td className="lineas__producto">
                    {l.nuevo ? (
                      <span><b className="texto-codigo">{l.codigo}</b> · {l.nuevo.descripcion} <Badge tono="verde">Nuevo</Badge></span>
                    ) : (
                      <SelectBuscable
                        opciones={opciones}
                        valor={l.codigo}
                        placeholder="Buscar código o descripción"
                        mensajeVacio={salida ? 'Sin stock libre con ese código' : 'No existe: use "Producto nuevo"'}
                        onChange={(codigo, opcion) => cambiar(l.clave, { codigo, producto: opcion?.producto || null })}
                      />
                    )}
                  </td>
                  <td>
                    <span className="lineas__condicion">
                      {condicion ? condiciones[condicion] : <span className="texto-suave">—</span>}
                      {!salida && l.producto && (
                        <button type="button" className="btn btn--fantasma btn--sm" onClick={() => onNuevo(l.producto, l.clave)}
                          title="Llega en otra condición: registrar otro código con los mismos datos" aria-label={`Otra condición de ${l.codigo}`}>
                          <Copy size={14} aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  </td>
                  <td>
                    <select className="select select--sm" aria-label={`Unidad de manejo de la línea ${i + 1}`} value={l.unidadId} onChange={e => cambiar(l.clave, { unidadId: e.target.value })}>
                      <option value="">Unidad</option>
                      {unidades.filter(u => !(u.factor === 1 && u.nombre.toLowerCase() === 'unidad')).map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}{u.factor > 1 ? ` (×${formatearNumero(u.factor)})` : ''}</option>
                      ))}
                    </select>
                  </td>
                  <td className="num">
                    <input className="input input--sm lineas__cantidad" type="number" min="1" step="1" placeholder="0" aria-label={`Cantidad de la línea ${i + 1}`}
                      value={l.cantidad} onChange={e => cambiar(l.clave, { cantidad: e.target.value })} />
                  </td>
                  <td className="num"><strong className={excede ? 'texto-aviso' : undefined}>{formatearNumero(total)}</strong></td>
                  {salida && <td className="num texto-suave">{l.producto ? formatearNumero(libreDe(l.producto)) : '—'}</td>}
                  <td className="centro">
                    <button type="button" className="btn btn--fantasma btn--sm" onClick={() => quitar(l.clave)} aria-label={`Quitar la línea ${i + 1}`} title="Quitar línea">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="lineas__acciones">
        <button type="button" className="btn btn--secundario btn--sm" onClick={() => setLineas(ls => [...ls, lineaVacia()])} disabled={lineas.length >= 100}>
          <Plus size={14} aria-hidden="true" /> Agregar línea
        </button>
        {!salida && (
          <button type="button" className="btn btn--secundario btn--sm" onClick={() => onNuevo(null, null)} disabled={lineas.length >= 100}>
            <PackagePlus size={14} aria-hidden="true" /> Producto nuevo
          </button>
        )}
      </div>
    </div>
  )
}
