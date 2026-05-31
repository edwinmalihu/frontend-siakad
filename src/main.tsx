import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { LicenseProvider } from './contexts/LicenseContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LicenseProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LicenseProvider>
    </AuthProvider>
  </StrictMode>,
)
