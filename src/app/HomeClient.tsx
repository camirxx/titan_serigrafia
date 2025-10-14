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
      setCurrentDate(
        now.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
      setCurrentTime(
        now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
  };



  const isAdmin = userRole === 'admin' || userRole === 'desarrollador';

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Decorative diagonal stripes */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-0 top-0 h-full w-full">
          <div className="absolute left-1/4 top-0 h-full w-32 -skew-x-12 transform bg-gradient-to-b from-green-400 to-transparent"></div>
          <div className="absolute left-1/3 top-0 h-full w-24 -skew-x-12 transform bg-gradient-to-b from-green-500 to-transparent"></div>
          <div className="absolute right-1/4 top-0 h-full w-32 -skew-x-12 transform bg-gradient-to-b from-green-400 to-transparent"></div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:p-6">
          <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:gap-8">
            <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 px-6 py-3 text-white sm:px-8 sm:py-4">
              <h1 className="text-xl font-bold sm:text-2xl">
                Hola{userName ? `, ${userName}` : ''} 👋
              </h1>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 px-6 py-3 text-white sm:px-8 sm:py-4">
              <h2 className="text-xl font-bold uppercase sm:text-2xl">
                {userRole}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center sm:text-right">
              <p className="text-xs text-gray-600 sm:text-sm">{currentDate}</p>
              <p className="text-base font-semibold sm:text-lg">{currentTime}</p>
            </div>
            <div
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl sm:h-20 sm:w-20"
              aria-label="Avatar"
              title={userName}
            >
              <span className="text-2xl sm:text-3xl">👤</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-12">
        <div className="min-h-[400px] rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur sm:min-h-[500px] sm:p-12">
          {/* Main Action Buttons - Single Row */}
          <div
            className={`mb-8 grid gap-6 sm:mb-12 sm:gap-8 ${
              isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {/* VENTAS */}
            <button
              onClick={() => handleNavigation('/pos')}
              className="group min-h-[200px] rounded-2xl border-2 border-gray-200 bg-white p-8 transition-all duration-300 hover:scale-105 hover:border-purple-400 hover:bg-purple-50 hover:shadow-xl sm:min-h-[240px] sm:p-12"
            >
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="text-7xl sm:text-8xl">💰</div>
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 sm:text-2xl">
                  VENTAS
                </h3>
              </div>
            </button>

            {/* INVENTARIO */}
            <button
              onClick={() => handleNavigation('/inventario')}
              className="group min-h-[200px] rounded-2xl border-2 border-gray-200 bg-white p-8 transition-all duration-300 hover:scale-105 hover:border-purple-400 hover:bg-purple-50 hover:shadow-xl sm:min-h-[240px] sm:p-12"
            >
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="text-7xl sm:text-8xl">📋</div>
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 sm:text-2xl">
                  INVENTARIO
                </h3>
              </div>
            </button>

            {/* TRABAJADORES - Solo Admin */}
            {isAdmin && (
              <button
                onClick={() => handleNavigation('/trabajadores')}
                className="group min-h-[200px] rounded-2xl border-2 border-gray-200 bg-white p-8 transition-all duration-300 hover:scale-105 hover:border-purple-400 hover:bg-purple-50 hover:shadow-xl sm:min-h-[240px] sm:p-12"
              >
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div className="text-7xl sm:text-8xl">👥</div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 sm:text-2xl">
                    TRABAJADORES
                  </h3>
                </div>
              </button>
            )}

            {/* DASHBOARD - Solo Admin */}
            {isAdmin && (
              <button
                onClick={() => handleNavigation('/dashboard')}
                className="group min-h-[200px] rounded-2xl border-2 border-gray-200 bg-white p-8 transition-all duration-300 hover:scale-105 hover:border-purple-400 hover:bg-purple-50 hover:shadow-xl sm:min-h-[240px] sm:p-12"
              >
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div className="text-7xl sm:text-8xl">📊</div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 sm:text-2xl">
                    REPORTES
                  </h3>
                </div>
              </button>
            )}
          </div>

        </div>
      </main>

      
    </div>
  );
}
