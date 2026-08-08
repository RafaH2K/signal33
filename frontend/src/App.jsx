import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import CartDrawer from './components/layout/CartDrawer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import Home from './pages/Home.jsx';
import Store from './pages/Store.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Trayectoria from './pages/Trayectoria.jsx';
import SignalPage from './pages/Signal.jsx';
import Orders from './pages/Orders.jsx';
import Profile from './pages/Profile.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import AdminProducts from './pages/admin/Products.jsx';
import AdminGallery from './pages/admin/Gallery.jsx';
import AdminEvents from './pages/admin/Events.jsx';
import AdminAbout from './pages/admin/About.jsx';
import AdminSignals from './pages/admin/Signals.jsx';
import AdminOrders from './pages/admin/Orders.jsx';
import AdminUsers from './pages/admin/Users.jsx';

export default function App() {
  const { pathname } = useLocation();
  // SIGNAL es pantalla completa (se siente como salir del sitio) y el admin
  // tiene su propio shell (sidebar): ninguno de los dos necesita el chrome público.
  const hideSiteChrome = pathname === '/signal' || pathname.startsWith('/admin');

  return (
    <>
      {!hideSiteChrome && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tienda" element={<Store />} />
        <Route path="/tienda/:id" element={<ProductDetail />} />
        <Route path="/trayectoria" element={<Trayectoria />} />
        <Route path="/signal" element={<SignalPage />} />
        <Route
          path="/pedidos"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="galeria" element={<AdminGallery />} />
          <Route path="eventos" element={<AdminEvents />} />
          <Route path="trayectoria" element={<AdminAbout />} />
          <Route path="signal" element={<AdminSignals />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="usuarios" element={<AdminUsers />} />
        </Route>
      </Routes>

      {!hideSiteChrome && <Footer />}
      {!hideSiteChrome && <CartDrawer />}
    </>
  );
}
