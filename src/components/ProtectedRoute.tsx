import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthService } from '@/lib/auth';

export function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = AuthService.isAuthenticated();

  if (!isAuthenticated) {
    // Redirect to the login page, but save the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
} 