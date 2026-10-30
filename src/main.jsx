import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DialogosProvider from './components/ui/DialogosProvider'
import AuthProvider from './components/AuthProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DialogosProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DialogosProvider>
  </StrictMode>,
)
