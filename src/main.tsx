import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { router } from './app/router'
import './index.css'
import { queryClient } from './lib/queryClient'

const el = document.getElementById('root')
if (!el) throw new Error('Root element #root not found')

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

const appTree = (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
)

createRoot(el).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
    ) : (
      appTree
    )}
  </StrictMode>
)
