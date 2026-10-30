// URL base del backend. Vacía = mismo sitio: en producción Vercel reenvía /api a Render
// (vercel.json) y en desarrollo lo hace el proxy de Vite (vite.config.js).
// Así la cookie de sesión es del propio sitio y no la bloquea el navegador.
export const API_URL = import.meta.env.VITE_API_URL || ''
