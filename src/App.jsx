import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowRightLeft, PackageSearch, History, Settings, LogOut, Menu } from 'lucide-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Historial from './pages/Historial'
import Movimientos from './pages/Movimientos'
import logoBab from './assets/logo-bab.png'

function NavItem({ to, icon: Icon, label, isExpanded }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to} style={{ 
      display: 'flex', alignItems: 'center', justifyContent: isExpanded ? 'flex-start' : 'center',
      color: isActive ? '#E31837' : 'white', textDecoration: 'none', fontSize: '15px', 
      padding: '12px 15px', borderRadius: '4px', 
      backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
      borderLeft: isActive ? '4px solid #E31837' : '4px solid transparent',
      fontWeight: isActive ? 'bold' : 'normal', transition: 'all 0.2s ease',
      marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden'
    }}>
      <Icon size={20} style={{ minWidth: '20px', marginRight: isExpanded ? '15px' : '0' }} />
      {isExpanded && <span>{label}</span>}
    </Link>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isExpanded, setIsExpanded] = useState(true)

  if (!currentUser) {
    return <Login onLogin={(usuario) => setCurrentUser(usuario)} />
  }

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui' }}>
        
        {/* Menú Lateral con fondo Azul Oscuro */}
        <div style={{ width: isExpanded ? '250px' : '70px', backgroundColor: '#0f223e', color: 'white', padding: '20px 10px', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease' }}>
          
          <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginBottom: '20px', display: 'flex', justifyContent: isExpanded ? 'flex-end' : 'center' }}>
            <Menu size={24} />
          </button>

          <Link to="/" style={{ textAlign: 'center', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px', textDecoration: 'none', display: 'block' }}>
            <img src={logoBab} alt="Logo BAB" style={{ maxHeight: isExpanded ? '45px' : '25px', width: 'auto', objectFit: 'contain', marginBottom: '10px', transition: 'all 0.3s ease' }} />
            {isExpanded && <h2 style={{ margin: 0, color: 'white', fontSize: '18px' }}>SMI - ControlBAB</h2>}
          </Link>
          
          <nav style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" isExpanded={isExpanded} />
            <NavItem to="/movimientos" icon={ArrowRightLeft} label="Ingresos y Retiros" isExpanded={isExpanded} />
            <NavItem to="/inventario" icon={PackageSearch} label="Inventario Maestro" isExpanded={isExpanded} />
            <NavItem to="/historial" icon={History} label="Historial" isExpanded={isExpanded} />
            <NavItem to="/parametros" icon={Settings} label="Configuración" isExpanded={isExpanded} />
          </nav>

          <button onClick={() => setCurrentUser(null)} style={{ padding: '12px', backgroundColor: 'transparent', color: '#ff8a8a', border: '1px solid #ff8a8a', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <LogOut size={20} style={{ marginRight: isExpanded ? '10px' : '0' }} />
            {isExpanded && <span>Cerrar Sesión</span>}
          </button>
        </div>

        {/* Contenedor Principal con el nuevo fondo azul */}
        <div style={{ flex: 1, padding: '30px', backgroundColor: '#152e52', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/movimientos" element={<Movimientos usuarioActual={currentUser} />} />
            <Route path="/inventario" element={<Inventario usuarioActual={currentUser} />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/parametros" element={<h2>⚙️ Configuración y Parámetros</h2>} /> 
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

      </div>
    </BrowserRouter>
  )
}

export default App