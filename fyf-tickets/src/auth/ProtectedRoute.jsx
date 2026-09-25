import { Navigate, useLocation } from 'react-router-dom';
import { getUser, isAuthenticated } from './auth.js';

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(getUser()?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
