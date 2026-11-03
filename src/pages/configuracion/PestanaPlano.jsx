import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Plus, Pencil, Trash2, Inbox, Map as MapIcon } from 'lucide-react'
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

const TIPOS = { AREA: 'Área', ENTRADA: 'Entrada', PUERTA: 'Puerta', CALLE: 'Calle (texto)', PC: 'PC', PASO: 'Paso o zona rayada' }
const TONO = { AREA: 'azul', ENTRADA: 'verde', PUERTA: 'naranja', CALLE: 'gris', PC: 'indigo', PASO: 'gris' }

function ModalElemento({ elemento, onCerrar, onGuardado }) {
  const nuevo = !elemento
  const areas = (useLista('/api/catalogos/ubicaciones?activos=1').datos || []).filter(u => !u.estanteriaId)
  const [form, setForm] = useState(() => ({
    zona: elemento?.zona || 'Z1', tipo: elemento?.tipo || 'AREA', etiqueta: elemento?.etiqueta || '',
    x: elemento?.x ?? 1, y: elemento?.y ?? 1, ancho: elemento?.ancho ?? 4, alto: elemento?.alto ?? 3, ubicacion: elemento?.ubicacion || ''
  }))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (campos) => setForm(f => ({ ...f, ...campos }))

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    const cuerpo = { ...form, x: Number(form.x), y: Number(form.y), ancho: Number(form.ancho), alto: Number(form.alto), ubicacion: form.tipo === 'AREA' ? form.ubicacion : '' }
    try {
      const guardado = await pedirJSON(nuevo ? '/api/plano' : `/api/plano/${elemento.id}`, { method: nuevo ? 'POST' : 'PATCH', body: cuerpo })
      onGuardado(guardado, nuevo)
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={nuevo ? 'Nuevo elemento del plano' : `Editar ${elemento.etiqueta}`} icono={nuevo ? Plus : Pencil} onCerrar={onCerrar} ancho
      acciones={<>
        <button type="button" className="btn btn--secundario" onClick={onCerrar}>Cancelar</button>
        <button type="submit" form="form-elemento" className="btn btn--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <form id="form-elemento" onSubmit={guardar} className="form-fila form-modal">
        {error && <div className="estado-error campo--completo" role="alert" style={{ marginBottom: 0 }}><span>{error}</span></div>}
        <Campo etiqueta="Zona *" ayuda="Z1, Z2…" tamano="angosto">
          <input className="input" value={form.zona} required maxLength={3} onChange={e => cambiar({ zona: e.target.value.toUpperCase() })} />
        </Campo>
        <Campo etiqueta="Tipo *">
          <select className="select" value={form.tipo} onChange={e => cambiar({ tipo: e.target.value })}>
            {Object.entries(TIPOS).map(([v, et]) => <option key={v} value={v}>{et}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Texto *" tamano="ancho">
          <input className="input" value={form.etiqueta} required maxLength={60} onChange={e => cambiar({ etiqueta: e.target.value })} />
        </Campo>
        {form.tipo === 'AREA' && (
          <Campo etiqueta="Ubicación del área" ayuda="Al hacer clic en el plano se ve lo que hay en ella. Sin enlazar = área de trabajo donde no se guarda producto (p. ej. Alistamiento)." tamano="completo">
            <select className="select" value={form.ubicacion} onChange={e => cambiar({ ubicacion: e.target.value })}>
              <option value="">Sin enlazar (área de trabajo)</option>
              {areas.map(u => <option key={u.id} value={u.codigo}>{u.codigo}{u.nombre ? ` · ${u.nombre}` : ''}</option>)}
            </select>
          </Campo>
        )}
        <Campo etiqueta="Columna (X) *" ayuda="Cuadros desde la izquierda" tamano="angosto">
          <input className="input" type="number" min={0} max={200} step={0.1} required value={form.x} onChange={e => cambiar({ x: e.target.value })} />
        </Campo>
        <Campo etiqueta="Fila (Y) *" ayuda="Cuadros desde arriba" tamano="angosto">
          <input className="input" type="number" min={0} max={200} step={0.1} required value={form.y} onChange={e => cambiar({ y: e.target.value })} />
        </Campo>
        <Campo etiqueta="Ancho *" ayuda="En cuadros" tamano="angosto">
          <input className="input" type="number" min={0.5} max={200} step={0.1} required value={form.ancho} onChange={e => cambiar({ ancho: e.target.value })} />
        </Campo>
        <Campo etiqueta="Alto *" ayuda="En cuadros" tamano="angosto">
          <input className="input" type="number" min={0.5} max={200} step={0.1} required value={form.alto} onChange={e => cambiar({ alto: e.target.value })} />
        </Campo>
        <p className="campo--completo texto-suave" style={{ margin: 0 }}>
          Un rack mide 2 cuadros de fondo y 1,5 por hueco de largo. Una entrada o puerta más alta que ancha se dibuja vertical.
        </p>
      </form>
    </Modal>
  )
}

// Configuración → Plano: áreas, entradas, puertas, calles y PC de cada zona. Los racks se ubican en Estanterías.
export default function PestanaPlano() {
  const puede = usePuede()
  const gestiona = puede('configuracion:gestionar')
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const { datos, error, recargar } = useLista('/api/plano')
  const [editando, setEditando] = useState(null)

  const borrar = async (el) => {
    if (!await confirmar({ titulo: `Quitar ${el.etiqueta}`, mensaje: 'Sale del plano. No borra la ubicación ni sus productos.', textoConfirmar: 'Quitar', peligro: true })) return
    try {
      await pedirJSON(`/api/plano/${el.id}`, { method: 'DELETE' })
      avisar(`${el.etiqueta} quitado del plano.`)
      recargar()
    } catch (err) {
      avisar(err.message, 'error')
    }
  }

  const columnas = [
    { id: 'zona', titulo: 'Zona', fija: true },
    { id: 'tipo', titulo: 'Tipo', valor: e => TIPOS[e.tipo], render: e => <Badge tono={TONO[e.tipo]}>{TIPOS[e.tipo]}</Badge> },
    { id: 'etiqueta', titulo: 'Texto', render: e => <strong>{e.etiqueta}</strong> },
    { id: 'ubicacion', titulo: 'Ubicación', valor: e => e.ubicacion || '', render: e => e.ubicacion || '—' },
    { id: 'posicion', titulo: 'Posición (X, Y)', valor: e => `${e.x}, ${e.y}`, render: e => `${e.x}, ${e.y}` },
    { id: 'tamano', titulo: 'Tamaño', valor: e => `${e.ancho} × ${e.alto}`, render: e => `${e.ancho} × ${e.alto}` },
    gestiona && {
      id: 'acciones', titulo: 'Acciones', fija: true, ordenable: false, alinear: 'centro', valor: () => '',
      render: e => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--secundario btn--sm" onClick={() => setEditando(e)} aria-label={`Editar ${e.etiqueta}`}><Pencil size={14} aria-hidden="true" /> Editar</button>
          <button className="btn btn--secundario btn--sm" style={{ color: 'var(--peligro)' }} onClick={() => borrar(e)} aria-label={`Quitar ${e.etiqueta}`}><Trash2 size={14} aria-hidden="true" /> Quitar</button>
        </div>
      )
    }
  ].filter(Boolean)

  return (
    <Card titulo="Plano de la bodega" icono={LayoutGrid}
      subtitulo="Lo que se dibuja en el Mapa además de los racks: áreas, entradas, puertas, nombres de calles y PC. Las medidas van en cuadros, como en el boceto."
      acciones={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to="/inventario-mapa" className="btn btn--secundario"><MapIcon size={16} aria-hidden="true" /> Ver mapa</Link>
        {gestiona && <button className="btn btn--primario" onClick={() => setEditando({})}><Plus size={16} aria-hidden="true" /> Agregar</button>}
      </div>}>
      <ErrorState mensaje={error} onReintentar={recargar} />
      <DataTable
        idTabla="plano"
        columnas={columnas}
        filas={error && !datos ? [] : datos}
        busqueda="Buscar en el plano…"
        ordenInicial={{ id: 'zona', dir: 'asc' }}
        vacio={{ icono: Inbox, titulo: 'El plano está vacío', mensaje: gestiona ? 'En Estanterías, "Completar con la distribución" lo crea según los bocetos.' : undefined }}
      />
      {editando && (
        <ModalElemento elemento={editando.id ? editando : null} onCerrar={() => setEditando(null)}
          onGuardado={(el, nuevo) => { setEditando(null); avisar(`${el.etiqueta} ${nuevo ? 'agregado' : 'actualizado'}.`); recargar() }} />
      )}
    </Card>
  )
}
