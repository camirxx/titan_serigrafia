// src/app/HomeClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface HomeClientProps {
  userRole: 'admin' | 'vendedor' | 'desarrollador';
  userName: string;
}

export default function HomeClient({ userRole, userName }: HomeClientProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Actualizar fecha y hora
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('es-ES', { 
        day: 'numeric',
        month: 'short', 
        year: 'numeric'
      }));
      setCurrentTime(now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/signout?redirect=/login';
    document.body.appendChild(form);
    form.submit();
  };

  const isAdmin = userRole === 'admin' || userRole === 'desarrollador';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative overflow-hidden">
      {/* Decorative diagonal stripes */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 left-1/4 w-32 h-full bg-gradient-to-b from-green-400 to-transparent transform -skew-x-12"></div>
          <div className="absolute top-0 left-1/3 w-24 h-full bg-gradient-to-b from-green-500 to-transparent transform -skew-x-12"></div>
          <div className="absolute top-0 right-1/4 w-32 h-full bg-gradient-to-b from-green-400 to-transparent transform -skew-x-12"></div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full sm:w-auto">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl">
              <h1 className="text-xl sm:text-2xl font-bold">BIENVENIDO</h1>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl">
              <h2 className="text-xl sm:text-2xl font-bold uppercase">{userRole}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center sm:text-right">
              <p className="text-xs sm:text-sm text-gray-600">{currentDate}</p>
              <p className="text-base sm:text-lg font-semibold">{currentTime}</p>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
              <span className="text-white text-2xl sm:text-3xl">👤</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-12">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-12 min-h-[400px] sm:min-h-[500px]">
          
          {/* Main Action Buttons - Single Row */}
          <div className={`grid ${isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'} gap-6 sm:gap-8 mb-8 sm:mb-12`}>
            
            {/* VENTAS */}
            <button
              onClick={() => handleNavigation('/pos')}
              className="group bg-white hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-400 rounded-2xl p-8 sm:p-12 transition-all duration-300 hover:shadow-xl hover:scale-105 min-h-[200px] sm:min-h-[240px]"
            >
              <div className="flex flex-col items-center justify-center gap-4 h-full">
                <div className="text-7xl sm:text-8xl">💰</div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 group-hover:text-purple-600">
                  VENTAS
                </h3>
              </div>
            </button>

            {/* INVENTARIO */}
            <button
              onClick={() => handleNavigation('/inventario')}
              className="group bg-white hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-400 rounded-2xl p-8 sm:p-12 transition-all duration-300 hover:shadow-xl hover:scale-105 min-h-[200px] sm:min-h-[240px]"
            >
              <div className="flex flex-col items-center justify-center gap-4 h-full">
                <div className="text-7xl sm:text-8xl">📋</div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 group-hover:text-purple-600">
                  INVENTARIO
                </h3>
              </div>
            </button>

            {/* TRABAJADORES - Solo Admin */}
            {isAdmin && (
              <button
                onClick={() => handleNavigation('/trabajadores')}
                className="group bg-white hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-400 rounded-2xl p-8 sm:p-12 transition-all duration-300 hover:shadow-xl hover:scale-105 min-h-[200px] sm:min-h-[240px]"
              >
                <div className="flex flex-col items-center justify-center gap-4 h-full">
                  <div className="text-7xl sm:text-8xl">👥</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 group-hover:text-purple-600">
                    TRABAJADORES
                  </h3>
                </div>
              </button>
            )}

            {/* DASHBOARD - Solo Admin */}
            {isAdmin && (
              <button
                onClick={() => handleNavigation('/dashboard')}
                className="group bg-white hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-400 rounded-2xl p-8 sm:p-12 transition-all duration-300 hover:shadow-xl hover:scale-105 min-h-[200px] sm:min-h-[240px]"
              >
                <div className="flex flex-col items-center justify-center gap-4 h-full">
                  <div className="text-7xl sm:text-8xl">📊</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 group-hover:text-purple-600">
                    DASHBOARD
                  </h3>
                </div>
              </button>
            )}

          </div>

          {/* Configuraciones Button */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <button
              onClick={() => handleNavigation('/caja')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 hover:shadow-xl hover:scale-105 w-full sm:w-auto"
            >
              CONFIGURACIONES
            </button>
          </div>

        </div>
      </main>

      {/* Logout Button */}
      <div className="relative z-10 flex justify-center pb-8 sm:pb-12 px-4">
        <button
          onClick={handleLogout}
          className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-8 sm:px-10 py-2 sm:py-3 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 hover:shadow-xl w-full sm:w-auto max-w-md"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}