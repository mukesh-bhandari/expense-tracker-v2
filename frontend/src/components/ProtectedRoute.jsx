import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext.jsx";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);

  // Show nothing while loading
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen page-shell flex items-center justify-center px-4">
        <div className="state-panel px-8 py-10 text-center max-w-sm w-full">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary-light flex items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Loading your workspace</h1>
          <p className="text-sm text-muted-foreground">Checking your session and preparing the app.</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
