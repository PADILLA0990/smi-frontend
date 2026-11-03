import { useEffect, useRef } from 'react'

/**
 * Botón con un panel desplegable (Filtros, Columnas…). Se cierra al hacer clic fuera o con Escape.
 * El contenido sigue en la página aunque esté cerrado, así los filtros conservan su valor.
 */
export default function Desplegable({ etiqueta, icono: Icono, contador = 0, alinear = 'izquierda', className = '', children }) {
  const ref = useRef(null)
  useEffect(() => {
    const fuera = (e) => { const d = ref.current; if (d?.open && !d.contains(e.target)) d.open = false }
    const escape = (e) => {
      const d = ref.current
      if (e.key === 'Escape' && d?.open) { d.open = false; d.querySelector('summary')?.focus() }
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', escape) }
  }, [])

  return (
    <details ref={ref} className={`desplegable desplegable--${alinear} ${className}`.trim()}>
      <summary className={`btn btn--sm ${contador > 0 ? 'btn--primario' : 'btn--secundario'}`}>
        {Icono && <Icono size={14} aria-hidden="true" />} {etiqueta}
        {contador > 0 && <span className="desplegable__contador" aria-label={`${contador} activo${contador === 1 ? '' : 's'}`}>{contador}</span>}
      </summary>
      <div className="desplegable__panel">{children}</div>
    </details>
  )
}
