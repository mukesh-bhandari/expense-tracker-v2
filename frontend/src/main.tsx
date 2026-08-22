import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Signup from './pages/signup/Signup'
import Room from './pages/room/Room'
import Home from './pages/home/Home'
import Expenses from './pages/expenses/Expenses'
import InviteAccept from './pages/invite/InviteAccept'
import { AuthProvider } from './contexts/AuthProvider'
import { Toaster } from 'sonner'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/login/Login'
import ForgotPassword from './pages/forgot-password/ForgotPassword'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/invite/accept',
    element: <InviteAccept />,
  },
  {
    path: '/rooms',
    element: (
      <ProtectedRoute>
        <Room />
      </ProtectedRoute>
    ),
  },
  {
    path: '/:roomId/expenses',
    element: (
      <ProtectedRoute>
        <Expenses />
      </ProtectedRoute>
    ),
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
