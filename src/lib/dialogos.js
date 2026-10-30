import { createContext, useContext } from 'react'

// Contexto que reemplaza alert/confirm/prompt del navegador por ventanas y avisos propios.
// El proveedor está en components/ui/DialogosProvider.jsx
export const DialogosContexto = createContext(null)

const useDialogos = () => {
  const ctx = useContext(DialogosContexto)
  if (!ctx) throw new Error('Falta <DialogosProvider> en el árbol de componentes')
  return ctx
}

// confirmar({ titulo, mensaje, textoConfirmar, peligro, campo }) → Promise
//   sin campo: resuelve true / false
//   con campo { etiqueta, placeholder, valorInicial }: resuelve el texto escrito o null si se cancela
export const useConfirmar = () => useDialogos().confirmar

// avisar(mensaje, tipo = 'exito' | 'error' | 'info')
export const useAvisar = () => useDialogos().avisar
