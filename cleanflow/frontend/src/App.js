import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Apartments from "./pages/Apartments";
import Calendar from "./pages/Calendar";
import Cleanings from "./pages/Cleanings";
import Cleaners from "./pages/Cleaners";
import CleanerView from "./pages/CleanerView";

function ProtectedRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#666"}}>Načítání...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/cleaner" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cleaner" element={<ProtectedRoute><CleanerView /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute adminOnly><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/apartments" />} />
            <Route path="apartments" element={<Apartments />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="cleanings" element={<Cleanings />} />
            <Route path="cleaners" element={<Cleaners />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
