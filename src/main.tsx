import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { router } from './app/router'
/** Gộp chunk login vào main — tránh lỗi load module trên production khi vào /login */
import './app/routes/_auth/login'
import './index.css'
import { queryClient } from './lib/queryClient'
import { TooltipProvider } from './components/ui/tooltip'

const el = document.getElementById('root')
if (!el) throw new Error('Root element #root not found')

createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={280}>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
)
