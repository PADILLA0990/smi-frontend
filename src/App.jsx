import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowRightLeft, PackageSearch, History, Settings, LogOut, Menu, ClipboardList, Map as MapIcon, Clock, Loader2, Users, KeyRound, ChevronDown, Lock, AlertCircle, Route as RouteIcon, BarChart3, Scale } from 'lucide-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Historial from './pages/Historial'
import Movimientos from './pages/Movimientos'
import Solicitudes from './pages/Solicitudes'
import Remision from './pages/Remision'
import InventarioMapa from './pages/InventarioMapa'
import Configuracion from './pages/Configuracion'
import Comprobante from './pages/Comprobante'
import UsuariosPagina from './pages/Usuarios'
import Novedades from './pages/Novedades'
import Trazabilidad from './pages/Trazabilidad'
import Conciliacion from './pages/Conciliacion'
import CambiarPassword from './pages/CambiarPassword'
import Modal from './components/ui/Modal'
import EmptyState from './components/ui/EmptyState'
import Card from './components/ui/Card'
import { SkeletonTabla } from './components/ui/Skeleton'
import { suscribirConexion, estaConectando } from './lib/conexion'
import { formatearFecha, formatearHora } from './lib/formato'
import { useSesion, usePuede, ETIQUETA_ROL } from './lib/auth'
import logoBab from './assets/logo-bab.png'

// Indicadores trae Recharts: se carga solo al abrir la página
const Indicadores = lazy(() => import('./pages/Indicadores'))

const NOMBRE_APP = 'SMI-ControlBAB'

// Menú lateral, título de la pestaña y permiso necesario de cada ruta
const RUTAS = [
  { ruta: '/', icono: LayoutDashboard, etiqueta: 'Dashboard', titulo: 'Panel Principal' },
  { ruta: '/movimientos', icono: ArrowRightLeft, etiqueta: 'Ingresos y Retiros', titulo: 'Ingresos y Retiros', permiso: 'movimientos:registrar' },
  { ruta: '/solicitudes', icono: ClipboardList, etiqueta: 'Solicitudes SBO', titulo: 'Solicitudes SBO' },
  { ruta: '/inventario', icono: PackageSearch, etiqueta: 'Inventario Maestro', titulo: 'Inventario Maestro' },
  { ruta: '/inventario-mapa', icono: MapIcon, etiqueta: 'Mapa de Bodega', titulo: 'Mapa de Bodega' },
  { ruta: '/novedades', icono: AlertCircle, etiqueta: 'Novedades', titulo: 'Novedades' },
  { ruta: '/trazabilidad', icono: RouteIcon, etiqueta: 'Trazabilidad', titulo: 'Trazabilidad' },
  { ruta: '/indicadores', icono: BarChart3, etiqueta: 'Indicadores', titulo: 'Indicadores' },
  { ruta: '/conciliacion', icono: Scale, etiqueta: 'Conciliación', titulo: 'Conciliación' },
  { ruta: '/historial', icono: History, etiqueta: 'Historial', titulo: 'Historial de Movimientos' },
  { ruta: '/usuarios', icono: Users, etiqueta: 'Usuarios', titulo: 'Gestión de usuarios', permiso: 'usuarios:gestionar' },
  { ruta: '/parametros', icono: Settings, etiqueta: 'Configuración', titulo: 'Configuración' }
]

const CLAVE_MENU = 'smi-menu-colapsado'

// Mismo corte que la media query de index.css
const esAngosta = () => window.matchMedia('(max-width: 760px)').matches

function leerMenu() {
  try { return localStorage.getItem(CLAVE_MENU) } catch { return null }
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

// Menú del usuario conectado: datos, cambiar contraseña y cerrar sesión
function MenuUsuario({ onCambiarPassword }) {
  const { usuario, cerrarSesion } = useSesion()
  const menu = useRef(null)
  const cerrarMenu = () => { if (menu.current) menu.current.open = false }

  return (
    <details className="menu-usuario" ref={menu}>
      <summary aria-label="Menú de usuario">
        <span className="topbar__avatar" aria-hidden="true">{usuario.nombre.slice(0, 1).toUpperCase()}</span>
        <span>
          <strong>{usuario.usuario}</strong>
          <span className="topbar__rol"> · {ETIQUETA_ROL[usuario.rol]}</span>
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className="menu-usuario__lista">
        <div className="menu-usuario__info"><strong>{usuario.nombre}</strong>{ETIQUETA_ROL[usuario.rol]}</div>
        <button onClick={() => { cerrarMenu(); onCambiarPassword() }}><KeyRound size={16} aria-hidden="true" /> Cambiar contraseña</button>
        <button onClick={cerrarSesion}><LogOut size={16} aria-hidden="true" /> Cerrar sesión</button>
      </div>
    </details>
  )
}

function SinPermiso() {
  return (
    <Card>
      <EmptyState icono={Lock} titulo="Sin acceso" mensaje="Su rol no tiene permiso para esta sección. Si lo necesita, pídalo a un Administrador." />
    </Card>
  )
}

function Protegida({ permiso, children }) {
  const puede = usePuede()
  return !permiso || puede(permiso) ? children : <SinPermiso />
}

function App() {
  const { usuario, cerrarSesion } = useSesion()
  const puede = usePuede()
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  // En celular el menú arranca contraído; en pantallas grandes se recuerda la preferencia
  const [expandido, setExpandido] = useState(() =>
    !esAngosta() && (leerMenu() === null ? window.innerWidth > 900 : leerMenu() !== '1'))

  if (!usuario) return <Login />
  // Primer ingreso o contraseña restablecida: no se puede usar el sistema hasta cambiarla
  if (usuario.debe_cambiar_password) return <CambiarPassword obligatorio />

  const alternarMenu = () => {
    setExpandido(!expandido)
    if (esAngosta()) return
    try { localStorage.setItem(CLAVE_MENU, expandido ? '1' : '0') } catch { /* sin almacenamiento */ }
  }

  // En celular el menú se superpone al contenido: se cierra al elegir una opción
  const alNavegar = () => { if (esAngosta()) setExpandido(false) }

  const rutasVisibles = RUTAS.filter(r => !r.permiso || puede(r.permiso))

  return (
    <BrowserRouter>
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
            {rutasVisibles.map(r => <NavItem key={r.ruta} to={r.ruta} icono={r.icono} etiqueta={r.etiqueta} expandido={expandido} onNavegar={alNavegar} />)}
          </nav>

          <button className="sidebar__salir" onClick={cerrarSesion} title="Cerrar sesión">
            <LogOut size={18} aria-hidden="true" />
            {expandido && <span>Cerrar Sesión</span>}
          </button>
        </aside>

        <div className="principal">
          <header className="topbar">
            <Reloj />
            <MenuUsuario onCambiarPassword={() => setCambiandoPassword(true)} />
          </header>
          <BannerConexion />

          <main id="contenido" className="contenido">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/movimientos" element={<Protegida permiso="movimientos:registrar"><Movimientos /></Protegida>} />
              <Route path="/solicitudes" element={<Solicitudes />} />
              <Route path="/solicitudes/:codigo/remision" element={<Remision />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/inventario-mapa" element={<InventarioMapa />} />
              <Route path="/novedades" element={<Novedades />} />
              <Route path="/trazabilidad" element={<Trazabilidad />} />
              <Route path="/indicadores" element={<Suspense fallback={<Card><SkeletonTabla filas={6} columnas={3} /></Card>}><Indicadores /></Suspense>} />
              <Route path="/conciliacion" element={<Conciliacion />} />
              <Route path="/historial" element={<Historial />} />
              <Route path="/documentos/:ref" element={<Comprobante />} />
              <Route path="/usuarios" element={<Protegida permiso="usuarios:gestionar"><UsuariosPagina /></Protegida>} />
              <Route path="/parametros" element={<Configuracion />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>

      {cambiandoPassword && (
        <Modal titulo="Cambiar contraseña" icono={KeyRound} onCerrar={() => setCambiandoPassword(false)}>
          <CambiarPassword onListo={() => setCambiandoPassword(false)} />
        </Modal>
      )}
    </BrowserRouter>
  )
}

export default App
