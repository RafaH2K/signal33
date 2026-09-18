import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// staffOnly: admin o personal de taquilla
export default function ProtectedRoute({ adminOnly = false, staffOnly = false, children }) {
  const { user, loading, isAdmin, isStaff } = useAuth();

  if (loading) return <p className="px-6 pt-32 text-center text-sm text-mist">Cargando...</p>;
  // no hay página de login: el ingreso es un modal disparado desde el navbar
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (staffOnly && !isStaff) return <Navigate to="/" replace />;

  return children;
}
