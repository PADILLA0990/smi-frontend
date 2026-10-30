import { useId, useRef, useState } from 'react'

const normalizar = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MAX_OPCIONES = 50

/**
 * Combobox con autocompletar (patrón ARIA combobox + listbox).
 * opciones: [{ valor, etiqueta, detalle? }]   valor: texto del campo
 * onChange(valor, opcion | null)
 * permitirLibre: acepta un valor que no está en la lista (p. ej. un código nuevo).
 *   Si es false, el formulario no se puede enviar hasta elegir una opción válida.
 */
export default function SelectBuscable({ id, opciones, valor, onChange, placeholder, permitirLibre = false, required, disabled, mensajeVacio = 'Sin coincidencias' }) {
  const idLista = useId()
  const [abierto, setAbierto] = useState(false)
  const [resaltada, setResaltada] = useState(0)
  const input = useRef(null)

  const q = normalizar(valor)
  const filtradas = opciones
    .filter(o => !q || normalizar(o.valor).includes(q) || normalizar(o.etiqueta).includes(q))
    .slice(0, MAX_OPCIONES)

  const exacta = opciones.find(o => normalizar(o.valor) === q)

  const validar = (texto) => {
    if (!input.current) return
    const coincide = opciones.some(o => normalizar(o.valor) === normalizar(texto))
    input.current.setCustomValidity(!permitirLibre && texto && !coincide ? 'Seleccione un elemento de la lista.' : '')
  }

  const escribir = (texto) => {
    const opcion = opciones.find(o => normalizar(o.valor) === normalizar(texto)) || null
    onChange(texto, opcion)
    validar(texto)
    setAbierto(true)
    setResaltada(0)
  }

  const elegir = (opcion) => {
    onChange(opcion.valor, opcion)
    validar(opcion.valor)
    setAbierto(false)
  }

  const alTeclear = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setResaltada(i => Math.min(i + 1, filtradas.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setResaltada(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && abierto && filtradas[resaltada]) { e.preventDefault(); elegir(filtradas[resaltada]) }
    else if (e.key === 'Escape' && abierto) { e.stopPropagation(); setAbierto(false) }
  }

  const mostrarLista = abierto && !disabled && (filtradas.length > 0 || (!permitirLibre && valor))

  return (
    <div className="combo">
      <input
        id={id} ref={input} className="input" autoComplete="off" placeholder={placeholder}
        value={valor} required={required} disabled={disabled}
        role="combobox" aria-expanded={!!mostrarLista} aria-controls={idLista} aria-autocomplete="list"
        aria-activedescendant={mostrarLista && filtradas[resaltada] ? `${idLista}-${resaltada}` : undefined}
        onChange={e => escribir(e.target.value)}
        onFocus={() => setAbierto(true)}
        onBlur={() => { setAbierto(false); validar(valor) }}
        onKeyDown={alTeclear}
      />
      {mostrarLista && (
        <ul className="combo__lista" id={idLista} role="listbox">
          {filtradas.length === 0 ? <li className="combo__vacio">{mensajeVacio}</li> : filtradas.map((o, i) => (
            <li key={o.valor} id={`${idLista}-${i}`} role="option" aria-selected={i === resaltada}
              className="combo__opcion"
              onMouseDown={e => { e.preventDefault(); elegir(o) }}
              onMouseEnter={() => setResaltada(i)}>
              <span><b>{o.valor}</b>{o.etiqueta && o.etiqueta !== o.valor && ` · ${o.etiqueta}`}</span>
              {o.detalle && <small>{o.detalle}</small>}
            </li>
          ))}
        </ul>
      )}
      {permitirLibre && valor && !exacta && <span className="campo__ayuda">Código nuevo</span>}
    </div>
  )
}
