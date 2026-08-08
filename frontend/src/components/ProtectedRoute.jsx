import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ adminOnly = false, children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <p className="px-6 pt-32 text-center text-sm text-mist">Cargando...</p>;
  // no hay página de login: el ingreso es un modal disparado desde el navbar
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return children;
}
