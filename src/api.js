// URL del backend. En local se puede sobreescribir con VITE_API_URL en un archivo .env
export const API_URL = import.meta.env.VITE_API_URL || 'https://smi-backend-r3ac.onrender.com'

// Llama a la API y devuelve el JSON. Si el servidor responde con error o no hay conexión,
// lanza un Error con un mensaje listo para mostrar al usuario.
export async function pedirJSON(ruta, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${ruta}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new Error('No hay conexión con el servidor. Revise su internet e intente de nuevo.')
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    // Respuesta sin JSON: se maneja abajo según el código HTTP
  }

  if (!response.ok) {
    throw new Error(data?.error || `El servidor respondió con un error (${response.status}).`)
  }
  return data
}
