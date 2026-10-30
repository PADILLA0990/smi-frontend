import { useEffect, useState, useSyncExternalStore } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowRightLeft, PackageSearch, History, Settings, LogOut, Menu, ClipboardList, Map as MapIcon, Clock, Loader2 } from 'lucide-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Historial from './pages/Historial'
import Movimientos from './pages/Movimientos'
import Solicitudes from './pages/Solicitudes'
import InventarioMapa from './pages/InventarioMapa'
import Configuracion from './pages/Configuracion'
import DialogosProvider from './components/ui/DialogosProvider'
import { suscribirConexion, estaConectando } from './lib/conexion'
import { formatearFecha, formatearHora } from './lib/formato'
import logoBab from './assets/logo-bab.png'

const NOMBRE_APP = 'SMI-ControlBAB'

// Menú lateral y título de la pestaña de cada ruta
const RUTAS = [
  { ruta: '/', icono: LayoutDashboard, etiqueta: 'Dashboard', titulo: 'Panel Principal' },
  { ruta: '/movimientos', icono: ArrowRightLeft, etiqueta: 'Ingresos y Retiros', titulo: 'Ingresos y Retiros' },
  { ruta: '/solicitudes', icono: ClipboardList, etiqueta: 'Solicitudes SBO', titulo: 'Solicitudes SBO' },
  { ruta: '/inventario', icono: PackageSearch, etiqueta: 'Inventario Maestro', titulo: 'Inventario Maestro' },
  { ruta: '/inventario-mapa', icono: MapIcon, etiqueta: 'Mapa de Bodega', titulo: 'Mapa de Bodega' },
  { ruta: '/historial', icono: History, etiqueta: 'Historial', titulo: 'Historial de Movimientos' },
  { ruta: '/parametros', icono: Settings, etiqueta: 'Configuración', titulo: 'Configuración' }
]

// La sesión se guarda en sessionStorage: sobrevive a un refresco de página
// y se cierra al cerrar la pestaña del navegador
const CLAVE_SESION = 'smi-usuario'
const CLAVE_MENU = 'smi-menu-colapsado'

// Mismo corte que la media query de index.css
const esAngosta = () => window.matchMedia('(max-width: 760px)').matches

function leer(almacen, clave) {
  try { return almacen.getItem(clave) } catch { return null }
}

function guardarSesion(usuario) {
  try {
    if (usuario) sessionStorage.setItem(CLAVE_SESION, usuario)
    else sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // Almacenamiento bloqueado: la sesión dura solo mientras la página esté abierta
  }
}

function NavItem({ to, icono: Icono, etiqueta, expandido, onNavegar }) {
  const { pathname } = useLocation()
  const activo = pathname === to
  return (
    <Link to={to} className={`nav-item ${activo ? 'activo' : ''}`} aria-current={activo ? 'page' : undefined} title={expandido ? undefined : etiqueta} onClick={onNavegar}>
      <Icono size={20} aria-hidden="true" />
      {expandido && <span>{etiqueta}</span>}
    </Link>
  )
}

// Pone "Página · SMI-ControlBAB" en la pestaña del navegador
function TituloPestana() {
  const { pathname } = useLocation()
  useEffect(() => {
    const ruta = RUTAS.find(r => r.ruta === pathname)
    document.title = ruta ? `${ruta.titulo} · ${NOMBRE_APP}` : NOMBRE_APP
  }, [pathname])
  return null
}

function Reloj() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 15000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="topbar__hora" title="Hora de Bogotá">
      <Clock size={14} aria-hidden="true" /> {formatearFecha(ahora)} · {formatearHora(ahora)}
    </span>
  )
}

function BannerConexion() {
  const conectando = useSyncExternalStore(suscribirConexion, estaConectando)
  if (!conectando) return null
  return (
    <div className="banner-conexion" role="status">
      <Loader2 size={16} className="girando" aria-hidden="true" />
      Conectando con el servidor… si estaba inactivo puede tardar hasta un minuto. Reintentando automáticamente.
    </div>
  )
}

function App() {
  const [usuario, setUsuarioEstado] = useState(() => leer(sessionStorage, CLAVE_SESION))
  // En celular el menú arranca contraído; en pantallas grandes se recuerda la preferencia
  const [expandido, setExpandido] = useState(() =>
    !esAngosta() && (leer(localStorage, CLAVE_MENU) === null ? window.innerWidth > 900 : leer(localStorage, CLAVE_MENU) !== '1'))

  const setUsuario = (nuevo) => {
    guardarSesion(nuevo)
    setUsuarioEstado(nuevo)
  }

  const alternarMenu = () => {
    setExpandido(!expandido)
    if (esAngosta()) return
    try { localStorage.setItem(CLAVE_MENU, expandido ? '1' : '0') } catch { /* sin almacenamiento */ }
  }

  // En celular el menú se superpone al contenido: se cierra al elegir una opción
  const alNavegar = () => { if (esAngosta()) setExpandido(false) }

  if (!usuario) {
    return (
      <DialogosProvider>
        <Login onLogin={setUsuario} />
      </DialogosProvider>
    )
  }

  return (
    <BrowserRouter>
      <DialogosProvider>
        <TituloPestana />
        <a href="#contenido" className="saltar">Saltar al contenido</a>
        <div className="app">
          <aside className={`sidebar ${expandido ? '' : 'colapsada'}`}>
            <button className="sidebar__toggle" onClick={alternarMenu} aria-label={expandido ? 'Contraer menú' : 'Expandir menú'} aria-expanded={expandido}>
              <Menu size={22} />
            </button>

            <Link to="/" className="sidebar__marca">
              <img src={logoBab} alt="Banco de Alimentos de Bogotá" />
              {expandido && <div className="sidebar__nombre">{NOMBRE_APP}</div>}
            </Link>

            <nav aria-label="Menú principal">
              {RUTAS.map(r => <NavItem key={r.ruta} to={r.ruta} icono={r.icono} etiqueta={r.etiqueta} expandido={expandido} onNavegar={alNavegar} />)}
            </nav>

            <button className="sidebar__salir" onClick={() => setUsuario(null)} title="Cerrar sesión">
              <LogOut size={18} aria-hidden="true" />
              {expandido && <span>Cerrar Sesión</span>}
            </button>
          </aside>

          <div className="principal">
            <header className="topbar">
              <Reloj />
              <span className="topbar__usuario">
                <span className="topbar__avatar" aria-hidden="true">{usuario.slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{usuario}</strong>
                  {/* El rol real llega con la Fase B (usuarios y roles) */}
                  <span className="topbar__rol"> · Operario</span>
                </span>
              </span>
            </header>
            <BannerConexion />

            <main id="contenido" className="contenido">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/movimientos" element={<Movimientos usuarioActual={usuario} />} />
                <Route path="/solicitudes" element={<Solicitudes usuarioActual={usuario} />} />
                <Route path="/inventario" element={<Inventario usuarioActual={usuario} />} />
                <Route path="/inventario-mapa" element={<InventarioMapa />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/parametros" element={<Configuracion />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
      </DialogosProvider>
    </BrowserRouter>
  )
}

export default App
