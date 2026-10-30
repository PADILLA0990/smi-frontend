import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Plus, Trash2, X, ScanBarcode } from 'lucide-react'
import { API_URL } from '../api'
import useScanner from '../hooks/useScanner'

const ESTADOS = ['CREADA', 'APROBADA', 'EN_ALISTAMIENTO', 'ALISTADA', 'DESPACHADA', 'CANCELADA']

const COLORES_ESTADO = {
  CREADA:          { bg: '#e0f2fe', color: '#075985' },
  APROBADA:        { bg: '#ede9fe', color: '#5b21b6' },
  EN_ALISTAMIENTO: { bg: '#fef3c7', color: '#92400e' },
  ALISTADA:        { bg: '#cffafe', color: '#155e75' },
  DESPACHADA:      { bg: '#dcfce7', color: '#166534' },
  CANCELADA:       { bg: '#fee2e2', color: '#991b1b' }
}

const ACCIONES = {
  aprobar:   { label: 'Aprobar',               color: '#5b21b6' },
  iniciar:   { label: 'Iniciar alistamiento',  color: '#d97706' },
  finalizar: { label: 'Finalizar alistamiento', color: '#0891b2' },
  despachar: { label: 'Despachar',             color: '#10b981' },
  cancelar:  { label: 'Cancelar',              color: '#E31837' }
}

// Usuarios disponibles como alistadores (los mismos del login)
const ALISTADORES = ['Operario01', 'Operario02']

const FORM_VACIO = { codigo_sbo: '', beneficiario: '', fecha_requerida: '', observaciones: '', items: [{ codigo_producto: '', cantidad_solicitada: '' }] }

const estiloInput = { padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }
const estiloLabel = { fontSize: '13px', fontWeight: 'bold', color: '#64748b' }
const estiloTarjeta = { backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', marginBottom: '30px' }
const estiloTitulo = { marginTop: 0, color: '#152e52', fontSize: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }
const estiloTh = { padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#475569' }
const estiloTd = { padding: '12px', borderBottom: '1px solid #f1f5f9' }

function BadgeEstado({ estado }) {
  const { bg, color } = COLORES_ESTADO[estado]
  return (
    <span style={{ backgroundColor: bg, color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
      {estado.replace('_', ' ')}
    </span>
  )
}

export default function Solicitudes({ usuarioActual }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [productos, setProductos] = useState([])
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState(FORM_VACIO)
  const [detalle, setDetalle] = useState(null)
  const [alistador, setAlistador] = useState(ALISTADORES[0])
  const [cantidades, setCantidades] = useState({})

  const cargarSolicitudes = useCallback(() => {
    fetch(`${API_URL}/api/solicitudes${filtro ? `?estado=${filtro}` : ''}`)
      .then(res => res.json())
      .then(data => setSolicitudes(Array.isArray(data) ? data : []))
  }, [filtro])

  useEffect(() => { cargarSolicitudes() }, [cargarSolicitudes])

  useEffect(() => {
    fetch(`${API_URL}/api/productos`)
      .then(res => res.json())
      .then(data => setProductos(data))
  }, [])

  // Cada lectura del escáner agrega el producto a la nueva solicitud (o suma 1 si ya está)
  useScanner((codigo) => {
    setForm(f => {
      const existente = f.items.findIndex(item => item.codigo_producto === codigo)
      if (existente >= 0) {
        const items = f.items.map((item, i) => i === existente ? { ...item, cantidad_solicitada: String((parseInt(item.cantidad_solicitada) || 0) + 1) } : item)
        return { ...f, items }
      }
      const vacia = f.items.findIndex(item => !item.codigo_producto)
      const nuevo = { codigo_producto: codigo, cantidad_solicitada: '1' }
      const items = vacia >= 0 ? f.items.map((item, i) => i === vacia ? nuevo : item) : [...f.items, nuevo]
      return { ...f, items }
    })
  })

  const abrirDetalle = async (id) => {
    const response = await fetch(`${API_URL}/api/solicitudes/${id}`)
    const data = await response.json()
    setDetalle(data)
    setCantidades(Object.fromEntries(data.items.map(item => [item.id, item.cantidad_alistada || item.cantidad_solicitada])))
  }

  const actualizarItem = (index, campo, valor) => {
    const items = form.items.map((item, i) => i === index ? { ...item, [campo]: valor } : item)
    setForm({ ...form, items })
  }

  const crearSolicitud = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/api/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          creado_por: usuarioActual,
          fecha_requerida: form.fecha_requerida || null,
          items: form.items.map(item => ({ ...item, cantidad_solicitada: parseInt(item.cantidad_solicitada) }))
        })
      })
      const data = await response.json()
      if (!response.ok) {
        alert(`❌ Error: ${data.error}`)
        return
      }
      alert(`✅ Solicitud ${data.codigo_sbo} creada por ${usuarioActual}`)
      setForm(FORM_VACIO)
      cargarSolicitudes()
    } catch {
      alert("❌ Error de conexión con el servidor.")
    }
  }

  const ejecutarAccion = async (accion) => {
    if (accion === 'cancelar' && !window.confirm(`⚠️ ¿Seguro que quieres cancelar la solicitud ${detalle.codigo_sbo}?`)) return
    if (accion === 'despachar' && !window.confirm(`¿Confirmar despacho de ${detalle.codigo_sbo}? Se descontará el stock del inventario.`)) return

    try {
      const response = await fetch(`${API_URL}/api/solicitudes/${detalle.id}/transicion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion,
          usuario: usuarioActual,
          alistador: accion === 'iniciar' ? alistador : undefined,
          cantidades: accion === 'finalizar' ? Object.fromEntries(Object.entries(cantidades).map(([id, n]) => [id, parseInt(n)])) : undefined
        })
      })
      const data = await response.json()
      if (!response.ok) {
        alert(`❌ Error: ${data.error}`)
        return
      }
      setDetalle(data)
      cargarSolicitudes()
    } catch {
      alert("❌ Error de conexión con el servidor.")
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', color: 'white' }}>
        <ClipboardList size={36} color="#E31837" />
        <h1 style={{ margin: 0 }}>Solicitudes SBO</h1>
      </div>

      {/* NUEVA SOLICITUD */}
      <div style={estiloTarjeta}>
        <h2 style={{ ...estiloTitulo, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📝 Nueva Solicitud</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>
            <ScanBarcode size={18} /> Escanee productos para agregarlos
          </span>
        </h2>

        <datalist id="codigos-productos">
          {productos.map(p => <option key={p.id} value={p.codigo_producto}>{p.descripcion} ({p.cantidad} disp.)</option>)}
        </datalist>

        <form onSubmit={crearSolicitud}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 1 }}>
              <label style={estiloLabel}>Código SBO</label>
              <input placeholder="Ej: SBO-2026-001" value={form.codigo_sbo} onChange={e => setForm({ ...form, codigo_sbo: e.target.value })} required style={estiloInput} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 2 }}>
              <label style={estiloLabel}>Beneficiario / Organización</label>
              <input placeholder="Ej: Fundación XYZ" value={form.beneficiario} onChange={e => setForm({ ...form, beneficiario: e.target.value })} required style={estiloInput} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={estiloLabel}>Fecha requerida</label>
              <input type="date" value={form.fecha_requerida} onChange={e => setForm({ ...form, fecha_requerida: e.target.value })} style={estiloInput} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexBasis: '100%' }}>
              <label style={estiloLabel}>Observaciones</label>
              <input placeholder="Opcional" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} style={estiloInput} />
            </div>
          </div>

          <label style={estiloLabel}>Productos solicitados</label>
          {form.items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
              <input list="codigos-productos" placeholder="Código del producto" value={item.codigo_producto} onChange={e => actualizarItem(index, 'codigo_producto', e.target.value)} required style={{ ...estiloInput, flexGrow: 1 }} />
              <input type="number" min="1" placeholder="Cantidad" value={item.cantidad_solicitada} onChange={e => actualizarItem(index, 'cantidad_solicitada', e.target.value)} required style={{ ...estiloInput, width: '120px' }} />
              <button type="button" disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })} style={{ background: 'none', border: 'none', cursor: form.items.length === 1 ? 'not-allowed' : 'pointer', color: '#94a3b8' }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
            <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { codigo_producto: '', cantidad_solicitada: '' }] })} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 16px', backgroundColor: 'transparent', color: '#152e52', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              <Plus size={16} /> Agregar producto
            </button>
            <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Crear Solicitud
            </button>
          </div>
        </form>
      </div>

      {/* DETALLE DE LA SOLICITUD SELECCIONADA */}
      {detalle && (
        <div style={estiloTarjeta}>
          <div style={{ ...estiloTitulo, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {detalle.codigo_sbo} <BadgeEstado estado={detalle.estado} />
            </span>
            <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
          </div>

          <p style={{ color: '#475569', marginTop: 0 }}>
            <b>Beneficiario:</b> {detalle.beneficiario} · <b>Creada por:</b> {detalle.creado_por}
            {detalle.alistador && <> · <b>Alistador:</b> {detalle.alistador}</>}
            {detalle.fecha_requerida && <> · <b>Requerida:</b> {new Date(detalle.fecha_requerida).toLocaleDateString()}</>}
          </p>
          {detalle.observaciones && <p style={{ color: '#64748b', fontSize: '14px' }}>{detalle.observaciones}</p>}

          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={estiloTh}>Código</th>
                <th style={estiloTh}>Descripción</th>
                <th style={estiloTh}>Solicitada</th>
                <th style={estiloTh}>Alistada</th>
              </tr>
            </thead>
            <tbody>
              {detalle.items.map(item => (
                <tr key={item.id}>
                  <td style={{ ...estiloTd, fontWeight: 'bold', color: '#152e52' }}>{item.codigo_producto}</td>
                  <td style={estiloTd}>{item.descripcion}</td>
                  <td style={estiloTd}>{item.cantidad_solicitada}</td>
                  <td style={estiloTd}>
                    {detalle.estado === 'EN_ALISTAMIENTO' ? (
                      <input type="number" min="0" max={item.cantidad_solicitada} value={cantidades[item.id]} onChange={e => setCantidades({ ...cantidades, [item.id]: e.target.value })} style={{ ...estiloInput, padding: '6px', width: '80px' }} />
                    ) : item.cantidad_alistada}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {detalle.acciones.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
              {detalle.acciones.includes('iniciar') && (
                <select value={alistador} onChange={e => setAlistador(e.target.value)} style={{ ...estiloInput, padding: '10px' }}>
                  {ALISTADORES.map(a => <option key={a} value={a}>Alistador: {a}</option>)}
                </select>
              )}
              {detalle.acciones.map(accion => (
                <button key={accion} onClick={() => ejecutarAccion(accion)} style={{ padding: '10px 18px', backgroundColor: ACCIONES[accion].color, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {ACCIONES[accion].label}
                </button>
              ))}
            </div>
          )}

          <h3 style={{ color: '#152e52', fontSize: '15px' }}>Trazabilidad</h3>
          {detalle.eventos.map(ev => (
            <div key={ev.id} style={{ fontSize: '13px', color: '#475569', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#94a3b8' }}>{new Date(ev.fecha).toLocaleString()}</span> · {ev.estado_anterior ? `${ev.estado_anterior} → ` : ''}<b>{ev.estado_nuevo}</b> · {ev.usuario}{ev.nota && ` · ${ev.nota}`}
            </div>
          ))}
        </div>
      )}

      {/* LISTADO */}
      <div style={estiloTarjeta}>
        <div style={{ ...estiloTitulo, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📋 Solicitudes</span>
          <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...estiloInput, padding: '8px', fontSize: '14px' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(est => <option key={est} value={est}>{est.replace('_', ' ')}</option>)}
          </select>
        </div>

        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={estiloTh}>SBO</th>
              <th style={estiloTh}>Beneficiario</th>
              <th style={estiloTh}>Estado</th>
              <th style={estiloTh}>Ítems</th>
              <th style={estiloTh}>Alistador</th>
              <th style={estiloTh}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No hay solicitudes registradas.</td></tr>
            ) : (
              solicitudes.map(sol => (
                <tr key={sol.id} onClick={() => abrirDetalle(sol.id)} style={{ cursor: 'pointer', backgroundColor: detalle?.id === sol.id ? '#f1f5f9' : 'transparent' }}>
                  <td style={{ ...estiloTd, fontWeight: 'bold', color: '#152e52' }}>{sol.codigo_sbo}</td>
                  <td style={estiloTd}>{sol.beneficiario}</td>
                  <td style={estiloTd}><BadgeEstado estado={sol.estado} /></td>
                  <td style={estiloTd}>{sol.items.length}</td>
                  <td style={estiloTd}>{sol.alistador || '—'}</td>
                  <td style={{ ...estiloTd, color: '#64748b', fontSize: '13px' }}>{new Date(sol.fecha_solicitud).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
