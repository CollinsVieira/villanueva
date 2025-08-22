import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import loginImage from '../../assets/login-image.webp';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login, isLoading, error: authError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Por favor complete todos los campos');
      return;
    }

    const success = await login(email, password);
    if (!success) {
      setLocalError(authError || 'Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] grid grid-cols-1 lg:grid-cols-2">
      {/* Columna izquierda: Formulario */}
      <div className="w-full max-w-xl mx-auto flex flex-col justify-center px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Bienvenido. :)</h1>
          <p className="mt-3 text-gray-600">Accede a tu cuenta y continúa con tu trabajo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo</label>
            <div className="mt-2 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresa tu correo"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <div className="mt-2 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
          </div>

          {localError && (
            <p className="text-sm text-red-600">{localError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#36a837] text-white font-medium hover:opacity-90 hover:bg-[#232e85] transition disabled:opacity-60"
          >
            {isLoading ? 'Iniciando sesión...' : 'Inicia sesión'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <span className="w-full border-t border-gray-200"></span>
            </div>
          </div>

          {/* Sin Google, solo el separador se mantiene para coincidir con la maqueta */}

          <p className="text-center text-sm text-gray-600">
            ¿No tienes una cuenta? <span className="text-indigo-600 hover:text-indigo-700">Solicitala a tu administrador</span>
          </p>
        </form>
      </div>

      {/* Columna derecha: Imagen decorativa */}
      
      <div className="hidden lg:block bg-[#232e85]">
        <div className="h-full w-full bg-cover bg-center" style={{
          backgroundImage: `url(${loginImage})`
        }} />
      </div>
     
       {/* --------------------------- */}
    </div>
    
    
  );
};

export default LoginForm;