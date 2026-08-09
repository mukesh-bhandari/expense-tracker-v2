import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Signup from "./pages/signup/Signup.jsx";
import Room from "./pages/room/Room.jsx";
import Home from "./pages/home/Home.jsx";
import Expenses from "./pages/expenses/Expenses.jsx";
import InviteAccept from "./pages/invite/InviteAccept.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { Toaster } from "sonner";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/login/Login.jsx";
import ForgotPassword from "./pages/forgot-password/ForgotPassword.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/invite/accept",
    element: <InviteAccept />,
  },
  {
    path: "/rooms",
    element: (
      <ProtectedRoute>
        <Room />
      </ProtectedRoute>
    ),
  },
  {
    path: "/:roomId/expenses",
    element: (
      <ProtectedRoute>
        <Expenses />
      </ProtectedRoute>
    ),
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
