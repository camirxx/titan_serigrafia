// src/app/(privado)/(admin)/trabajadores/TrabajadoresUI.tsx
"use client";

import { useState, useTransition } from 'react';
import { Search, Users, Shield, Check, X, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Rol = "admin" | "vendedor" | "desarrollador";
type Tienda = {
  id: number;
  nombre: string;
};
type Usuario = {
  id: string;
  email: string | null;
  nombre: string | null;
  rol: Rol | null;
  activo: boolean | null;
  tienda_id: number | null;
  tienda_nombre: string | null;
  created_at: string | null;
};

interface TrabajadoresUIProps {
  usuarios: Usuario[];
  tiendas: Tienda[];
  updateRole: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  toggleActivo: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  updateTienda: (formData: FormData) => Promise<{ success: boolean; message: string }>;
}

export default function TrabajadoresUI({ 
  usuarios, 
  tiendas, 
  updateRole, 
  toggleActivo, 
  updateTienda 
}: TrabajadoresUIProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    nombre: '',
    rol: 'vendedor' as Rol,
    tienda_id: ''
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateRole = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateRole(formData);
      showNotification(result.success ? 'success' : 'error', result.message);
    });
  };

  const handleToggleActivo = async (formData: FormData) => {
    startTransition(async () => {
      const result = await toggleActivo(formData);
      showNotification(result.success ? 'success' : 'error', result.message);
    });
  };

  const handleUpdateTienda = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateTienda(formData);
      showNotification(result.success ? 'success' : 'error', result.message);
    });
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRolBadgeColor = (rol: Rol | null) => {
    switch (rol) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'desarrollador': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'vendedor': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRolIcon = (rol: Rol | null) => {
    switch (rol) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'desarrollador': return <Shield className="w-4 h-4" />;
      case 'vendedor': return <Users className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative overflow-hidden">
      {/* Franjas decorativas */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-32 h-full bg-gradient-to-b from-green-400 to-transparent transform -skew-x-12"></div>
        <div className="absolute top-0 left-1/3 w-24 h-full bg-gradient-to-b from-green-500 to-transparent transform -skew-x-12"></div>
        <div className="absolute top-0 right-1/4 w-32 h-full bg-gradient-to-b from-green-400 to-transparent transform -skew-x-12"></div>
      </div>

      {/* Notificaciones */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-lg border-2 transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-500/90 border-green-300 text-white' 
            : 'bg-red-500/90 border-red-300 text-white'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => router.push('/')}
                className="p-3 hover:bg-purple-100 rounded-full transition"
              >
                <ChevronLeft className="w-6 h-6 text-purple-700" />
              </button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Trabajadores</h1>
                <p className="text-gray-600 mt-1">Administra usuarios, roles y permisos del sistema</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-purple-100 rounded-full">
                  <span className="font-bold text-purple-900">{usuarios.length}</span>
                  <span className="text-purple-700 ml-1">trabajadores</span>
                </div>
              </div>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar trabajador por email o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pb-12">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Tabla Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">Trabajador</th>
                  <th className="px-6 py-4 text-left font-bold">Rol</th>
                  <th className="px-6 py-4 text-left font-bold">Tienda Asignada</th>
                  <th className="px-6 py-4 text-left font-bold">Estado</th>
                  <th className="px-6 py-4 text-left font-bold">Fecha Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map((u, idx) => (
                  <tr 
                    key={u.id} 
                    className={`border-b hover:bg-purple-50 transition ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    {/* Info del Trabajador */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {u.nombre?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{u.nombre || 'Sin nombre'}</div>
                          <div className="text-sm text-gray-500">{u.email || 'Sin email'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-6 py-4">
                      <form action={handleUpdateRole} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={u.id} />
                        <div className="relative">
                          <select
                            name="rol"
                            defaultValue={u.rol || ''}
                            onChange={(e) => {
                              const form = e.currentTarget.form;
                              if (form) {
                                const formData = new FormData(form);
                                handleUpdateRole(formData);
                              }
                            }}
                            className={`appearance-none pl-3 pr-10 py-2 rounded-lg border-2 font-semibold cursor-pointer transition focus:ring-2 focus:ring-purple-500 outline-none ${
                              getRolBadgeColor(u.rol)
                            }`}
                          >
                            <option value="vendedor">Vendedor</option>
                            <option value="admin">Admin</option>
                            <option value="desarrollador">Desarrollador</option>
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            {getRolIcon(u.rol)}
                          </div>
                        </div>
                      </form>
                    </td>

                    {/* Tienda */}
                    <td className="px-6 py-4">
                      <form action={handleUpdateTienda}>
                        <input type="hidden" name="id" value={u.id} />
                        <select
                          name="tienda_id"
                          defaultValue={u.tienda_id || ''}
                          onChange={(e) => {
                            const form = e.currentTarget.form;
                            if (form) {
                              const formData = new FormData(form);
                              handleUpdateTienda(formData);
                            }
                          }}
                          className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition cursor-pointer"
                        >
                          <option value="">Sin asignar</option>
                          {tiendas.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                          ))}
                        </select>
                      </form>
                    </td>

                    {/* Estado Activo/Inactivo */}
                    <td className="px-6 py-4">
                      <form action={handleToggleActivo} className="flex items-center gap-3">
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="activo" value={(!u.activo).toString()} />
                        <button
                          type="submit"
                          disabled={isPending}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                            u.activo ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                              u.activo ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-sm font-medium ${
                          u.activo ? 'text-green-700' : 'text-gray-500'
                        }`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </form>
                    </td>

                    {/* Fecha de Registro */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.created_at 
                        ? new Date(u.created_at).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="lg:hidden divide-y divide-gray-200">
            {filteredUsuarios.map((u) => (
              <div key={u.id} className="p-6 hover:bg-purple-50 transition">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {u.nombre?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{u.nombre || 'Sin nombre'}</div>
                    <div className="text-sm text-gray-500">{u.email || 'Sin email'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Rol */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Rol</label>
                    <form action={handleUpdateRole}>
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="rol"
                        defaultValue={u.rol || ''}
                        onChange={(e) => {
                          const form = e.currentTarget.form;
                          if (form) {
                            const formData = new FormData(form);
                            handleUpdateRole(formData);
                          }
                        }}
                        className={`w-full pl-3 pr-10 py-2 rounded-lg border-2 font-semibold ${
                          getRolBadgeColor(u.rol)
                        }`}
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="admin">Admin</option>
                        <option value="desarrollador">Desarrollador</option>
                      </select>
                    </form>
                  </div>

                  {/* Tienda */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Tienda</label>
                    <form action={handleUpdateTienda}>
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="tienda_id"
                        defaultValue={u.tienda_id || ''}
                        onChange={(e) => {
                          const form = e.currentTarget.form;
                          if (form) {
                            const formData = new FormData(form);
                            handleUpdateTienda(formData);
                          }
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
                      >
                        <option value="">Sin asignar</option>
                        {tiendas.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </form>
                  </div>

                  {/* Estado */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Estado</span>
                    <form action={handleToggleActivo} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="activo" value={(!u.activo).toString()} />
                      <button
                        type="submit"
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${
                          u.activo ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                            u.activo ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-sm ${u.activo ? 'text-green-700' : 'text-gray-500'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Estado Vacío */}
          {filteredUsuarios.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {searchTerm ? 'No se encontraron trabajadores' : 'No hay trabajadores registrados'}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Intenta con otro término de búsqueda' 
                  : 'Los nuevos trabajadores aparecerán aquí'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}