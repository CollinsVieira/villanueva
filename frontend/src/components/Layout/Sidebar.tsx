import React from "react";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  CheckSquare,
  Users,
  CreditCard,
  UserPen,
  FileText,
  ShoppingCart,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { useNavigate } from "react-router-dom";
import logo from "/logo3.webp";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path?: string;
}

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { user, logout } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const adminMenuItems: MenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { id: "clientes", label: "Clientes", icon: Users, path: "/admin/clientes" },
    { id: "lotes", label: "Lotes", icon: CheckSquare, path: "/admin/lotes" },
    { id: "pagos", label: "Pagos", icon: CreditCard, path: "/admin/pagos" },
    { id: "ventas", label: "Ventas", icon: ShoppingCart, path: "/admin/ventas" },
    { id: "reportes", label: "Reportes", icon: FileText, path: "/admin/reportes" },
    { id: "usuarios", label: "Usuarios", icon: UserPen, path: "/admin/usuarios" },
  ];

  const workerMenuItems: MenuItem[] = [
    { id: "profile", label: "Mi Perfil", icon: Settings, path: "/profile" },
    { id: "lotes", label: "Lotes", icon: CheckSquare, path: "/lotes" },
    { id: "clientes", label: "Clientes", icon: Users, path: "/clientes" },
    { id: "pagos", label: "Pagos", icon: CreditCard, path: "/pagos" },
  ];

  const menuItems = user?.role === "admin" ? adminMenuItems : workerMenuItems;

  return (
    <>
      {/* Overlay para móviles */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={`bg-[#eff3fa] shadow-lg h-full w-64 fixed left-0 top-0 z-50 transform transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header con botón toggle */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-4 items-center flex-1">
              <img src={logo} alt="VillanuevaLogo" className="w-10 h-10 bg-black rounded-lg mx-auto" />
              <p className="text-sm text-black font-bold text-center">
                Sistema de Gestión de Lotes
              </p>
              <p className="text-sm text-black font-bold text-center">
                Grupo Serfer & Asociados
              </p>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Ocultar sidebar"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
        </div>

      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onViewChange(item.id);
                    if (item.path) {
                      navigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                    currentView === item.id
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
