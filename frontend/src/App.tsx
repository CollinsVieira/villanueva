import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SidebarProvider, useSidebar } from "./contexts/SidebarContext";
import LoginForm from "./components/Auth/LoginForm";
import Sidebar from "./components/Layout/Sidebar";
import UserManagement from "./components/Users/UserManagement";
import Dashboard from "./components/Dashboard/Dashboard";

import CustomerManagement from "./components/Customers/CustomerManagement"; // <-- Import añadido
import LoteManagement from "./components/Lotes/LoteManagement"; 
import PaymentManagement from "./components/Payments/PaymentManagement";
import SalesPage from "./pages/SalesPage";
import DynamicReports from "./pages/DynamicReports";


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
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${
        isSidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        {/* Botón toggle para abrir sidebar */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="fixed top-4 left-4 z-30 p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
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
        
        <Route
          path="/admin/reportes"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout>
                <DynamicReports />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* --- NUEVA RUTA PARA VENTAS --- */}
        <Route
          path="/admin/ventas"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout>
                <SalesPage />
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
      <SidebarProvider>
        <MainApp />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: 'green',
                secondary: 'black',
              }
            },
          }}
        />
      </SidebarProvider>
    </AuthProvider>
  );
}

export default App;