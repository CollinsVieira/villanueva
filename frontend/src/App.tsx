import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginForm from "./components/Auth/LoginForm";
import Sidebar from "./components/Layout/Sidebar";
import UserManagement from "./components/Users/UserManagement";
import Dashboard from "./components/Dashboard/Dashboard";
import CustomerManagement from "./components/Customers/CustomerManagement"; // <-- Import añadido
import LoteManagement from "./components/Lotes/LoteManagement"; 
import PaymentManagement from "./components/Payments/PaymentManagement";

// Componente para rutas protegidas
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
}> = ({ children, adminOnly = false }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Layout principal con sidebar
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

// Componente para redireccionar según el rol del usuario
const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

// Componente principal con rutas
const MainApp: React.FC = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Ruta de login */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                replace
              />
            ) : (
              <LoginForm />
            )
          }
        />

        {/* Redirección inicial */}
        <Route path="/" element={<DashboardRedirect />} />

        {/* Ruta general de dashboard (usuario no admin) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* --- Rutas para administradores --- */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout>
                <UserManagement />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* --- NUEVA RUTA PARA CLIENTES --- */}
        <Route
          path="/admin/clientes"
          element={
            <ProtectedRoute >
              <AppLayout>
                <CustomerManagement />
              </AppLayout>
            </ProtectedRoute>
          }
        />

           {/* --- NUEVA RUTA PARA PAGOS --- */}
        <Route
          path="/admin/pagos"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout>
                <PaymentManagement />
              </AppLayout>
            </ProtectedRoute>
          }
          />



        {/* Ruta catch-all para rutas no encontradas */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

 {/* --- RUTA DE LOTES AÑADIDA --- */}
        <Route
          path="/admin/lotes"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout>
                <LoteManagement />
              </AppLayout>
            </ProtectedRoute>
          }
        />

      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;