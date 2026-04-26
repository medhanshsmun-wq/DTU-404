import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL } from './config';
import LoginPage from './pages/LoginPage';
import GuestDashboard from './pages/GuestDashboard';
import ReportPage from './pages/ReportPage';
import ServiceRequestPage from './pages/ServiceRequestPage';
import EmergencyPage from './pages/EmergencyPage';
import EmergencyPlansPage from './pages/EmergencyPlansPage';
import FloorPlansPage from './pages/FloorPlansPage';
import GuestNavbar from './components/GuestNavbar';

// ── Auth Context ─────────────────────────────────
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('guest_token'));
  const [guest, setGuest] = useState(() => {
    const saved = localStorage.getItem('guest_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [alerts, setAlerts] = useState([]);

  const login = (newToken, guestData) => {
    setToken(newToken);
    setGuest(guestData);
    localStorage.setItem('guest_token', newToken);
    localStorage.setItem('guest_data', JSON.stringify(guestData));
  };

  const logout = () => {
    setToken(null);
    setGuest(null);
    localStorage.removeItem('guest_token');
    localStorage.removeItem('guest_data');
  };

  // Socket connection for real-time alerts
  useEffect(() => {
    if (!token) return;

    const socket = io(`${API_BASE_URL}/guest`);
    socket.emit('authenticate', token);

    socket.on('alert_update', (alert) => {
      setAlerts((prev) => {
        const exists = prev.find((a) => a.id === alert.id);
        if (exists) return prev;
        return [alert, ...prev].slice(0, 10);
      });
    });

    socket.on('alert_resolved_by_hotel', (data) => {
      setAlerts((prev) => 
        prev.map(alert => 
          alert.id === data.id ? { ...alert, hotelResolved: true, resolutionMessage: data.message } : alert
        )
      );
    });

    socket.on('authenticated', (data) => {
      if (!data.success) {
        logout();
      }
    });

    return () => socket.disconnect();
  }, [token]);

  const api = async (path, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-guest-token': token || '',
        ...options.headers,
      },
    });
    return res.json();
  };

  return (
    <AuthContext.Provider value={{ token, guest, login, logout, alerts, setAlerts, api }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Protected Route ──────────────────────────────
function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// ── App Layout ───────────────────────────────────
function AppLayout() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><GuestDashboard /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute><ServiceRequestPage /></ProtectedRoute>} />
        <Route path="/emergency" element={<ProtectedRoute><EmergencyPage /></ProtectedRoute>} />
        <Route path="/emergency-plans" element={<ProtectedRoute><EmergencyPlansPage /></ProtectedRoute>} />
        <Route path="/floor-plans" element={<ProtectedRoute><FloorPlansPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isLogin && <GuestNavbar />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
