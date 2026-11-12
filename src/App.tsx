import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useSocketStore } from './stores/socketStore';
import { getSocket } from './services/socket';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Workspaces from './pages/Workspaces';
import WorkspaceDetails from './pages/WorkspaceDetails';
import MeetingRoom from './pages/MeetingRoom';
import ProtectedRoute from './components/ProtectedRoute';
import ChangePassword from './pages/ChangePassword';
import JoinInvitation from './pages/JoinInvitation';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';

function App() {
  const { initializeAuth, isAuthenticated, accessToken } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  // Initialize authentication on app mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Connect socket when authenticated, disconnect on logout
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, accessToken, connect, disconnect]);

  // Expose socket globally for MeetingRoom component
  useEffect(() => {
    const socket = getSocket();
    (window as { socket?: ReturnType<typeof getSocket> }).socket = socket;
  }, []);

  // Cleanup socket on app unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/join/:invitationId" element={<ProtectedRoute><JoinInvitation /></ProtectedRoute>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces"
          element={
            <ProtectedRoute>
              <Workspaces />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces/:workspaceId"
          element={
            <ProtectedRoute>
              <WorkspaceDetails />
            </ProtectedRoute>
          }
        />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route
          path="/meeting/:meetingId"
          element={
            <ProtectedRoute>
              <MeetingRoom />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/workspaces" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
