// Fase E: tipos de novedad, colores y exportación a CSV (Excel en español)

export const TIPOS_NOVEDAD = {
  FALTANTE: 'Faltante',
  DANADO: 'Artículo dañado',
  TALLA_NO_DISPONIBLE: 'Talla no disponible',
  SUSTITUCION: 'Sustitución',
  DEVOLUCION: 'Devolución',
  OTRO: 'Otro'
}
// Las que se registran desde "Registrar novedad" (sustitución y devolución tienen su propio botón)
export const TIPOS_MANUALES = ['FALTANTE', 'DANADO', 'TALLA_NO_DISPONIBLE', 'OTRO']

export const TONO_NOVEDAD = {
  FALTANTE: 'naranja',
  DANADO: 'rojo',
  TALLA_NO_DISPONIBLE: 'ambar',
  SUSTITUCION: 'indigo',
  DEVOLUCION: 'verde',
  OTRO: 'gris'
}

// Qué se puede hacer con un ítem según el estado de la SBO
export const ESTADOS_CON_NOVEDAD = ['APROBADA', 'EN_ALISTAMIENTO', 'ALISTADA', 'DESPACHADA']
export const ESTADOS_SUSTITUCION = ['APROBADA', 'EN_ALISTAMIENTO']

// CSV separado por punto y coma (Excel en es-CO), con BOM para que abra bien las tildes
export function aCSV(columnas, filas) {
  const celda = (v) => {
    const t = v === null || v === undefined ? '' : String(v)
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const lineas = [columnas.map(c => celda(c.titulo)).join(';'), ...filas.map(f => columnas.map(c => celda(c.valor(f))).join(';'))]
  return '﻿' + lineas.join('\r\n')
}

export function descargarArchivo(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
