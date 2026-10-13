import { useState } from 'react';
import logoBab from '../assets/logo-bab.png';

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (usuario === 'Operario01' && password === 'OP01-BAB') {
      onLogin('Operario01');
    } else if (usuario === 'Operario02' && password === 'OP02-BAB') {
      onLogin('Operario02');
    } else {
      setError('Credenciales incorrectas. Acceso denegado.');
    }
  };

  return (
    // Fondo Azul Principal
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#152e52', fontFamily: 'system-ui' }}>
      <div style={{ padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        
        {/* Logo que ahora sí se verá sobre el azul */}
        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
            <img src={logoBab} alt="Logo Banco de Alimentos Bogotá" style={{ maxHeight: '80px', width: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Textos en Blanco */}
        <h2 style={{ color: 'white', marginBottom: '5px', fontSize: '24px' }}>SMI - ControlBAB</h2>
        <p style={{ color: '#cbd5e1', marginBottom: '40px', fontSize: '15px' }}>Plataforma de Control Logístico e Inventario</p>

        {error && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '4px', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input type="text" placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} required style={{ padding: '16px', borderRadius: '8px', border: 'none', fontSize: '15px', backgroundColor: 'rgba(255,255,255,0.9)' }} />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '16px', borderRadius: '8px', border: 'none', fontSize: '15px', backgroundColor: 'rgba(255,255,255,0.9)' }} />
          <button type="submit" style={{ padding: '16px', backgroundColor: '#E31837', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px', transition: 'background-color 0.2s' }}>
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}