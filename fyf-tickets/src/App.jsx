import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home.jsx';
import Event from './pages/Event.jsx';
import Login from './pages/Login.jsx';
import Reservation from './pages/Reservation.jsx';
import OrganizerDashboard from './pages/OrganizerDashboard.jsx';
import Register from './pages/Register.jsx';
import ReservationLookup from './pages/ReservationLookup.jsx';
import MyReservations from './pages/MyReservations.jsx';
import OrganizationStore from './pages/OrganizationStore.jsx';
import TicketValidate from './pages/TicketValidate.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/evento/:id"
        element={<Event />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route path="/registro" element={<Register />} />
      <Route path="/reserva/:trackingCode" element={<ReservationLookup />} />
      <Route path="/boletos/:trackingCode" element={<ReservationLookup />} />
      <Route path="/boletos/validar/:code" element={<TicketValidate />} />
      <Route path="/taquilla" element={<TicketValidate />} />
      <Route path="/mis-boletos" element={<MyReservations />} />
      <Route path="/organizador" element={<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}><OrganizerDashboard /></ProtectedRoute>} />
      <Route path="/organizacion/:slug" element={<OrganizationStore />} />

      <Route
        path="/evento/:id/reservar"
        element={
          <ProtectedRoute>
            <Reservation />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
