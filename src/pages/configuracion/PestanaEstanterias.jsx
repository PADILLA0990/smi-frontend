import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Warehouse, Plus, Pencil, Power, Inbox, Wand2, Map as MapIcon, Tags } from 'lucide-react'
import { pedirJSON } from '../../api'
import Card from '../../components/ui/Card'
import Campo from '../../components/ui/Campo'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import ErrorState from '../../components/ui/ErrorState'
import { useConfirmar, useAvisar } from '../../lib/dialogos'
import { usePuede } from '../../lib/auth'
import { useLista } from '../../lib/catalogos'
import { formatearNumero } from '../../lib/formato'

// Crear o editar una estantería. Zona y rack fijan los códigos de sus huecos (Z1-A-2-04), por eso no se editan.
function ModalEstanteria({ estanteria, onCerrar, onGuardado }) {
  const nueva = !estanteria
  const [form, setForm] = useState(() => ({
    zona: estanteria?.zona || 'Z1', rack: estanteria?.rack || '', calle: estanteria?.calle || '',
    niveles: estanteria?.niveles ?? 4, huecos: estanteria?.huecos ?? 4, huecos_superiores: estanteria?.huecos_superiores ?? '',
    orden: estanteria?.orden ?? 0, plano_x: estanteria?.plano_x ?? '', plano_y: estanteria?.plano_y ?? '', plano_vertical: estanteria?.plano_vertical ?? true
  }))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (campos) => setForm(f => ({ ...f, ...campos }))
  const codigo = `${form.zona || 'Z?'}-${form.rack || '?'}`
  const superiores = Number(form.huecos_superiores) || Number(form.huecos)
  const total = Number(form.niveles) >= 1 ? Number(form.huecos) + (Number(form.niveles) - 1) * superiores || 0 : 0

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    const opcional = (v) => (v === '' || v === null ? null : Number(v))
    const numeros = {
      niveles: Number(form.niveles), huecos: Number(form.huecos), huecos_superiores: opcional(form.huecos_superiores), orden: Number(form.orden) || 0,
      plano_x: opcional(form.plano_x), plano_y: opcional(form.plano_y), plano_vertical: form.plano_vertical
    }
    let cuerpo = nueva ? { zona: form.zona, rack: form.rack, calle: form.calle, ...numeros } : { calle: form.calle, ...numeros }
    if (!nueva) cuerpo = Object.fromEntries(Object.entries(cuerpo).filter(([k, v]) => String(v ?? '') !== String(estanteria[k] ?? '')))
    try {
      if (!nueva && Object.keys(cuerpo).length === 0) return onCerrar()
      const guardada = await pedirJSON(nueva ? '/api/estanterias' : `/api/estanterias/${estanteria.id}`, { method: nueva ? 'POST' : 'PATCH', body: cuerpo })
      onGuardado(guardada, nueva)
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={nueva ? 'Nueva estantería' : `Editar estantería ${estanteria.codigo}`} icono={nueva ? Plus : Pencil} onCerrar={onCerrar} ancho
      acciones={<>
        <button type="button" className="btn btn--secundario" onClick={onCerrar}>Cancelar</button>
        <button type="submit" form="form-estanteria" className="btn btn--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <form id="form-estanteria" onSubmit={guardar} className="form-fila form-modal">
        {error && <div className="estado-error campo--completo" role="alert" style={{ marginBottom: 0 }}><span>{error}</span></div>}
        <Campo etiqueta="Zona *" ayuda={nueva ? 'Z seguida del número: Z1, Z2…' : 'No se puede cambiar después de crear.'} tamano="angosto">
          <input className="input" value={form.zona} disabled={!nueva} required maxLength={3} onChange={e => cambiar({ zona: e.target.value.toUpperCase() })} />
        </Campo>
        <Campo etiqueta="Rack *" ayuda={nueva ? 'Una o dos letras: A, B…' : 'No se puede cambiar después de crear.'} tamano="angosto">
          <input className="input" value={form.rack} disabled={!nueva} required maxLength={2} onChange={e => cambiar({ rack: e.target.value.toUpperCase() })} />
        </Campo>
        <Campo etiqueta="Calle o pasillo" ayuda="Opcional (ej. Koaj, Koller)">
          <input className="input" value={form.calle} maxLength={60} onChange={e => cambiar({ calle: e.target.value })} />
        </Campo>
        <Campo etiqueta="Niveles *" ayuda="De 1 a 6. El nivel 1 es el de abajo." tamano="angosto">
          <input className="input" type="number" min={1} max={6} step={1} value={form.niveles} required onChange={e => cambiar({ niveles: e.target.value })} />
        </Campo>
        <Campo etiqueta="Huecos por nivel *" ayuda="De 1 a 30." tamano="angosto">
          <input className="input" type="number" min={1} max={30} step={1} value={form.huecos} required onChange={e => cambiar({ huecos: e.target.value })} />
        </Campo>
        <Campo etiqueta="Huecos desde el nivel 2" ayuda="Vacío si son iguales al nivel 1. En la Zona 1 hay uno más arriba." tamano="angosto">
          <input className="input" type="number" min={1} max={30} step={1} value={form.huecos_superiores} placeholder={String(form.huecos || '')} onChange={e => cambiar({ huecos_superiores: e.target.value })} />
        </Campo>
        <Campo etiqueta="Orden en el mapa" ayuda="Menor primero dentro de la zona." tamano="angosto">
          <input className="input" type="number" min={0} max={999} step={1} value={form.orden} onChange={e => cambiar({ orden: e.target.value })} />
        </Campo>
        <Campo etiqueta="Plano: columna (X)" ayuda="En cuadros, desde la izquierda. Vacío: no sale en el plano." tamano="angosto">
          <input className="input" type="number" min={0} max={200} step={0.1} value={form.plano_x} onChange={e => cambiar({ plano_x: e.target.value })} />
        </Campo>
        <Campo etiqueta="Plano: fila (Y)" ayuda="En cuadros, desde arriba." tamano="angosto">
          <input className="input" type="number" min={0} max={200} step={0.1} value={form.plano_y} onChange={e => cambiar({ plano_y: e.target.value })} />
        </Campo>
        <Campo etiqueta="Plano: sentido" tamano="angosto">
          <select className="select" value={form.plano_vertical ? 'v' : 'h'} onChange={e => cambiar({ plano_vertical: e.target.value === 'v' })}>
            <option value="v">Vertical</option>
            <option value="h">Horizontal</option>
          </select>
        </Campo>
        <p className="campo--completo texto-suave" style={{ margin: 0 }}>
          Huecos: <b>{formatearNumero(total)}</b>, de <code>{codigo}-1-01</code> a <code>{codigo}-{form.niveles || '?'}-{String((Number(form.niveles) > 1 ? superiores : form.huecos) || '?').padStart(2, '0')}</code>.
          {!nueva && ' Si reduce niveles o huecos, los que sobran deben estar vacíos.'}
        </p>
      </form>
    </Modal>
  )
}

export default function PestanaEstanterias() {
  const puede = usePuede()
  const gestiona = puede('configuracion:gestionar')
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const { datos, error, recargar } = useLista('/api/estanterias')
  const [editando, setEditando] = useState(null)
  const [cargandoInicial, setCargandoInicial] = useState(false)

  const alternarActivo = async (e) => {
    const ok = await confirmar({
      titulo: `${e.activo ? 'Desactivar' : 'Activar'} estantería ${e.codigo}`,
      mensaje: e.activo ? 'Sus huecos dejan de aparecer en el mapa y en los formularios. Debe estar vacía.' : 'Sus huecos vuelven a estar disponibles.',
      textoConfirmar: e.activo ? 'Desactivar' : 'Activar',
      peligro: e.activo
    })
    if (!ok) return
    try {
      await pedirJSON(`/api/estanterias/${e.id}`, { method: 'PATCH', body: { activo: !e.activo } })
      avisar(`Estantería ${e.codigo} ${e.activo ? 'desactivada' : 'activada'}.`)
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const cargarInicial = async () => {
    const ok = await confirmar({
      titulo: 'Cargar distribución inicial',
      mensaje: 'Crea los racks A–I de la Zona 1 y el rack J de la Zona 2 (todos de 3 niveles) y las áreas de cajas, piso y exhibición (Alistamiento se dibuja como área de trabajo). Solo crea lo que falte; luego se puede ajustar aquí.',
      textoConfirmar: 'Cargar'
    })
    if (!ok) return
    setCargandoInicial(true)
    try {
      const r = await pedirJSON('/api/estanterias/distribucion-inicial', { method: 'POST', body: {} })
      avisar(r.estanterias.length + r.areas.length ? `Creadas: ${[...r.estanterias, ...r.areas].join(', ')}.` : 'Ya estaba todo creado.')
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    } finally {
      setCargandoInicial(false)
    }
  }

  const completarPlano = async () => {
    const ok = await confirmar({
      titulo: 'Completar con la distribución',
      mensaje: 'Agrega a los racks ya creados lo que les falte: el hueco de más del nivel 2 hacia arriba en la Zona 1 y su posición en el plano, y crea el plano de las zonas que no lo tengan. Las mesas de alistamiento dejan de ser ubicaciones (no se guarda producto allí). No cambia lo demás que ya se haya configurado.',
      textoConfirmar: 'Completar'
    })
    if (!ok) return
    try {
      const r = await pedirJSON('/api/plano/completar', { method: 'POST', body: {} })
      const partes = []
      if (r.racks.length + r.elementos) partes.push(`Actualizados: ${r.racks.length} rack(s) y ${r.elementos} elemento(s) del plano.`)
      if (r.areas_retiradas?.length) partes.push(`Ya no son ubicaciones: ${r.areas_retiradas.join(', ')}.`)
      if (r.areas_con_producto?.length) partes.push(`Reubique primero el producto de: ${r.areas_con_producto.join(', ')}.`)
      avisar(partes.join(' ') || 'Ya estaba todo completo.', r.areas_con_producto?.length ? 'error' : undefined)
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const columnas = [
    { id: 'codigo', titulo: 'Estantería', fija: true, render: e => <strong>{e.codigo}</strong> },
    { id: 'calle', titulo: 'Calle', valor: e => e.calle || '', render: e => e.calle || '—' },
    { id: 'niveles', titulo: 'Niveles', alinear: 'derecha' },
    { id: 'huecos', titulo: 'Huecos por nivel', alinear: 'derecha', valor: e => e.huecos, render: e => e.huecos_superiores && e.huecos_superiores !== e.huecos ? `${e.huecos} · ${e.huecos_superiores} desde el nivel 2` : e.huecos },
    { id: 'plano', titulo: 'En el plano', valor: e => (e.plano_x === null ? '' : `${e.plano_x}, ${e.plano_y}`), render: e => (e.plano_x === null ? <span className="texto-suave">—</span> : `X ${e.plano_x} · Y ${e.plano_y}`) },
    { id: 'ubicaciones', titulo: 'Huecos', alinear: 'derecha' },
    { id: 'productos', titulo: 'Productos', alinear: 'derecha' },
    { id: 'orden', titulo: 'Orden', alinear: 'derecha' },
    { id: 'activo', titulo: 'Estado', valor: e => (e.activo ? 'Activa' : 'Inactiva'), render: e => <Badge tono={e.activo ? 'verde' : 'gris'}>{e.activo ? 'Activa' : 'Inactiva'}</Badge> },
    gestiona && {
      id: 'acciones', titulo: 'Acciones', fija: true, ordenable: false, alinear: 'centro', valor: () => '',
      render: e => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--secundario btn--sm" onClick={() => setEditando(e)} aria-label={`Editar ${e.codigo}`}><Pencil size={14} aria-hidden="true" /> Editar</button>
          <button className={`btn btn--sm ${e.activo ? 'btn--secundario' : 'btn--exito'}`} style={e.activo ? { color: 'var(--peligro)' } : undefined}
            onClick={() => alternarActivo(e)} aria-label={`${e.activo ? 'Desactivar' : 'Activar'} ${e.codigo}`}>
            <Power size={14} aria-hidden="true" /> {e.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      )
    }
  ].filter(Boolean)

  return (
    <Card titulo="Estanterías" icono={Warehouse}
      subtitulo="Racks del Mapa de Bodega. Al guardar se generan sus huecos (Z1-A-2-04 = zona, rack, nivel, hueco). Las áreas sin estantería se manejan en Ubicaciones."
      acciones={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to="/inventario-mapa" className="btn btn--secundario"><MapIcon size={16} aria-hidden="true" /> Ver mapa</Link>
        {datos?.length > 0 && <Link to="/demarcacion" className="btn btn--secundario"><Tags size={16} aria-hidden="true" /> Demarcación y etiquetas</Link>}
        {gestiona && datos?.length > 0 && <button className="btn btn--secundario" onClick={completarPlano}><Wand2 size={16} aria-hidden="true" /> Completar con la distribución</button>}
        {gestiona && <button className="btn btn--primario" onClick={() => setEditando({})}><Plus size={16} aria-hidden="true" /> Agregar</button>}
      </div>}>
      <ErrorState mensaje={error} onReintentar={recargar} />
      {gestiona && datos && datos.length === 0 && (
        <div className="aviso-info" style={{ marginBottom: 12 }}>
          <span>Aún no hay estanterías. Puede cargar la distribución propuesta según los bocetos y ajustarla después.</span>
          <button className="btn btn--primario btn--sm" onClick={cargarInicial} disabled={cargandoInicial}><Wand2 size={14} aria-hidden="true" /> {cargandoInicial ? 'Cargando…' : 'Cargar distribución inicial'}</button>
        </div>
      )}
      <DataTable
        idTabla="estanterias-v2"
        columnas={columnas}
        filas={error && !datos ? [] : datos}
        busqueda="Buscar estantería…"
        ordenInicial={{ id: 'codigo', dir: 'asc' }}
        vacio={{ icono: Inbox, titulo: 'No hay estanterías', mensaje: gestiona ? 'Use "Agregar" o cargue la distribución inicial.' : undefined }}
      />
      {editando && (
        <ModalEstanteria estanteria={editando.id ? editando : null} onCerrar={() => setEditando(null)}
          onGuardado={(e, nueva) => { setEditando(null); avisar(`Estantería ${e.codigo} ${nueva ? 'creada' : 'actualizada'}.`); recargar() }} />
      )}
    </Card>
  )
}
