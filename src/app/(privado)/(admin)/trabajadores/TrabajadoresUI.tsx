// src/app/(privado)/(admin)/trabajadores/TrabajadoresUI.tsx
"use client";

import { useState, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Shield, Check, X, ChevronLeft, UserPlus, Eye, EyeOff, Trash2, Edit3 } from 'lucide-react';

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

// 👇 Mover la definición del tipo ANTES del componente
type OptimisticAction =
  | { type: 'UPDATE_ROLE'; payload: { id: string; rol: Rol } }
  | { type: 'TOGGLE_ACTIVO'; payload: { id: string; activo: boolean } }
  | { type: 'UPDATE_TIENDA'; payload: { id: string; tienda_id: number | null } }
  | { type: 'DELETE_USER'; payload: { id: string } }
  | { type: 'CREATE_USER'; payload: Usuario };

interface TrabajadoresUIProps {
  usuarios: Usuario[];
  tiendas: Tienda[];
  currentUserId: string | null;
  updateRole: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  toggleActivo: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  updateTienda: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  createUser: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  deleteUser: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  updateUser: (formData: FormData) => Promise<{ success: boolean; message: string }>;
}

export default function TrabajadoresUI({ 
  usuarios: initialUsuarios, 
  tiendas, 
  currentUserId,
  updateRole, 
  toggleActivo, 
  updateTienda,
  createUser,
  deleteUser,
  updateUser
}: TrabajadoresUIProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    nombre: '',
    password: '',
    rol: 'vendedor' as Rol,
    tienda_id: ''
  });
  
 
  // Estado optimista para usuarios
  const [optimisticUsuarios, setOptimisticUsuarios] = useOptimistic(
    initialUsuarios,
    (state, action: OptimisticAction) => {
      switch (action.type) {
        case 'UPDATE_ROLE':
          return state.map(u => 
            u.id === action.payload.id 
              ? { ...u, rol: action.payload.rol }
              : u
          );
        case 'TOGGLE_ACTIVO':
          return state.map(u => 
            u.id === action.payload.id 
              ? { ...u, activo: action.payload.activo }
              : u
          );
        case 'UPDATE_TIENDA':
          const tienda = tiendas.find(t => t.id === action.payload.tienda_id);
          return state.map(u => 
            u.id === action.payload.id 
              ? { ...u, tienda_id: action.payload.tienda_id, tienda_nombre: tienda?.nombre || null }
              : u
          );
        case 'DELETE_USER':
          return state.filter(u => u.id !== action.payload.id);
        case 'CREATE_USER':
          return [...state, action.payload];
        default:
          return state;
      }
    }
  );

 

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleUpdateRole = async (id: string, rol: Rol) => {
    startTransition(async () => {
      setOptimisticUsuarios({ type: 'UPDATE_ROLE', payload: { id, rol } });
      
      const formData = new FormData();
      formData.append('id', id);
      formData.append('rol', rol);

      const result = await updateRole(formData);
      if (!result.success) {
        showNotification('error', result.message);
        // Revertir el cambio optimista
        const originalUser = initialUsuarios.find(u => u.id === id);
        if (originalUser?.rol) {
          setOptimisticUsuarios({ type: 'UPDATE_ROLE', payload: { 
            id, 
            rol: originalUser.rol 
          }});
        }
      } else {
        showNotification('success', result.message);
      }
    });
  };

  const handleToggleActivo = async (id: string, activo: boolean) => {
    startTransition(async () => {
      setOptimisticUsuarios({ type: 'TOGGLE_ACTIVO', payload: { id, activo } });

      const formData = new FormData();
      formData.append('id', id);
      formData.append('activo', activo.toString());

      const result = await toggleActivo(formData);
      if (!result.success) {
        showNotification('error', result.message);
        // Revertir el cambio optimista
        setOptimisticUsuarios({ type: 'TOGGLE_ACTIVO', payload: { 
          id, 
          activo: !activo 
        }});
      } else {
        showNotification('success', result.message);
      }
    });
  };

  const handleUpdateTienda = async (id: string, tienda_id: number | null) => {
    startTransition(async () => {
      setOptimisticUsuarios({ type: 'UPDATE_TIENDA', payload: { id, tienda_id } });

      const formData = new FormData();
      formData.append('id', id);
      if (tienda_id) {
        formData.append('tienda_id', tienda_id.toString());
      }

      const result = await updateTienda(formData);
      if (!result.success) {
        showNotification('error', result.message);
        // Revertir el cambio optimista
        const originalUser = initialUsuarios.find(u => u.id === id);
        setOptimisticUsuarios({ type: 'UPDATE_TIENDA', payload: { 
          id, 
          tienda_id: originalUser?.tienda_id || null
        }});
      } else {
        showNotification('success', result.message);
      }
    });
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUser(formData);
      if (result.success) {
        showNotification('success', result.message);
        setShowModal(false);
        setShowPassword(false);
        setNewUser({
          email: '',
          nombre: '',
          password: '',
          rol: 'vendedor',
          tienda_id: ''
        });
        // Recargar la página para obtener el nuevo usuario con ID real
        window.location.reload();
      } else {
        showNotification('error', result.message);
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    startTransition(async () => {
      setOptimisticUsuarios({ type: 'DELETE_USER', payload: { id: userId } });

      const formData = new FormData();
      formData.append('id', userId);
      const result = await deleteUser(formData);
      if (!result.success) {
        showNotification('error', result.message);
        // Revertir el cambio optimista - agregar de vuelta el usuario
        const deletedUser = initialUsuarios.find(u => u.id === userId);
        if (deletedUser) {
          setOptimisticUsuarios({ type: 'CREATE_USER', payload: deletedUser });
        }
      } else {
        showNotification('success', result.message);
      }
      setShowDeleteConfirm(null);
    });
  };

  const handleEditUser = (user: Usuario) => {
    setEditUser(user);
    setShowEditModal(user.id);
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;

    const formData = new FormData(e.currentTarget);
    formData.append('id', editUser.id);

    startTransition(async () => {
      // Actualizar optimista
      const updatedUser = {
        ...editUser,
        nombre: formData.get('nombre') as string,
        email: formData.get('email') as string,
        rol: formData.get('rol') as Rol,
        tienda_id: formData.get('tienda_id') ? Number(formData.get('tienda_id')) : null,
      };
      setOptimisticUsuarios({ type: 'CREATE_USER', payload: updatedUser });
      // Llamar a la API para actualizar
      const result = await updateUser(formData);
      if (!result.success) {
        showNotification('error', result.message);
        // Revertir el cambio optimista
        setOptimisticUsuarios({ type: 'CREATE_USER', payload: editUser });
      } else {
        showNotification('success', result.message);
        setShowEditModal(null);
        setEditUser(null);
      }
    });
  };

  // Separar el admin de los demás usuarios
  const adminUser = optimisticUsuarios.find(u => u.rol === 'admin');
  const otherUsers = optimisticUsuarios.filter(u => u.rol !== 'admin');
  
  // Filtrar usuarios según búsqueda (excepto admin que siempre se muestra)
  const filteredOtherUsers = otherUsers.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Combinar admin con usuarios filtrados
  const filteredUsuarios = adminUser ? [adminUser, ...filteredOtherUsers] : filteredOtherUsers;

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
    <div className="p-6">

      {/* Notificaciones - z-index mayor que el modal */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-xl shadow-2xl backdrop-blur-lg border-2 transition-all duration-300 ${
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

      {/* Header estilo POS */}
      <header className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition">
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">Gestión de Trabajadores</h1>
              <p className="text-white/80 text-sm mt-1">
                {initialUsuarios.length} trabajadores registrados
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl hover:bg-white/30 transition flex items-center gap-2 font-semibold"
            >
              <UserPlus className="w-5 h-5" />
              Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
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
        <div className="mt-6 grid gap-6 lg:grid-cols-2">

        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          
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
                  <th className="px-6 py-4 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map((u, idx) => {
                  const isAdminUser = u.rol === 'admin';
                  return (
                  <tr 
                    key={u.id} 
                    className={`border-b hover:bg-purple-50 transition ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    {/* Info del Trabajador */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${isAdminUser ? 'bg-gradient-to-br from-yellow-500 to-amber-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                          {isAdminUser ? '👑' : (u.nombre?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?')}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {u.nombre || 'Sin nombre'}
                            {isAdminUser && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                Administrador Principal
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{u.email || 'Sin email'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={u.rol || ''}
                          disabled={isAdminUser || u.id === currentUserId}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value as Rol)}
                          className={`appearance-none pl-3 pr-10 py-2 rounded-lg border-2 font-semibold transition focus:ring-2 focus:ring-purple-500 outline-none ${
                            getRolBadgeColor(u.rol)
                          } ${
                            isAdminUser ? 'opacity-50 cursor-not-allowed' : ''
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
                    </td>

                    {/* Tienda */}
                    <td className="px-6 py-4">
                      <select
                        value={u.tienda_id?.toString() || ''}
                        onChange={(e) => handleUpdateTienda(u.id, e.target.value ? parseInt(e.target.value) : null)}
                        className={`px-3 py-1.5 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition-all ${isAdminUser ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white border-gray-200'}`}
                        disabled={isAdminUser || u.rol === 'admin'}
                      >  
                        <option value="">Sin asignar</option>
                        {tiendas.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </td>

                    {/* Estado Activo/Inactivo */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleActivo(u.id, !u.activo)}
                          disabled={isAdminUser || u.id === currentUserId}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                            u.activo ? 'bg-green-500' : 'bg-gray-300'
                          } ${
                            (isAdminUser || u.id === currentUserId) ? 'opacity-50 cursor-not-allowed' : ''
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
                        {u.id === currentUserId && (
                          <span className="text-xs text-gray-400 italic">No puedes cambiar tu estado</span>
                        )}
                      </div>
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

                    {/* Acciones */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Botón Modificar - Estilo similar al basurero */}
                        <button 
                          onClick={() => {
                            handleEditUser(u);
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modificar usuario"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        
                        {/* Botón Eliminar */}
                        <button
                          onClick={() => setShowDeleteConfirm(u.id)}
                          disabled={u.id === currentUserId}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>  
                      {u.id === currentUserId && (
                        <span className="text-xs text-gray-400 italic block text-center mt-1">Tu cuenta</span>
                      )}
                    </td>
                  </tr>
               
                  );   
                  })}  

              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="lg:hidden divide-y divide-gray-200">
            {filteredUsuarios.map((u) => (
              <div key={u.id} className="p-6 hover:bg-purple-50 transition">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${u.rol === 'admin' ? 'bg-gradient-to-br from-yellow-500 to-amber-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                    {u.rol === 'admin' ? '👑' : (u.nombre?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?')}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {u.nombre || 'Sin nombre'}
                      {u.rol === 'admin' && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          Administrador Principal
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{u.email || 'Sin email'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Rol */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Rol</label>
                    <select
                      value={u.rol || ''}
                      disabled={u.rol === 'admin' || u.id === currentUserId}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value as Rol)}
                      className={`px-3 py-1.5 rounded-lg border-2 focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all ${getRolBadgeColor(u.rol)} ${u.rol === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="vendedor">Vendedor</option>
                      <option value="admin">Admin</option>
                      <option value="desarrollador">Desarrollador</option>
                    </select>
                    {u.id === currentUserId && (
                      <p className="text-xs text-gray-500 mt-1">No puedes cambiar tu propio rol</p>
                    )}
                  </div>

                  {/* Tienda */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Tienda</label>
                    <select
                      value={u.tienda_id || ''}
                      onChange={(e) => handleUpdateTienda(u.id, e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
                    >
                      <option value="">Sin asignar</option>
                      {tiendas.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Estado */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Estado</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActivo(u.id, !u.activo)}
                        disabled={u.rol === 'admin' || u.id === currentUserId}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${
                          u.activo ? 'bg-green-500' : 'bg-gray-300'
                        } ${
                          (u.rol === 'admin' || u.id === currentUserId) ? 'opacity-50 cursor-not-allowed' : ''
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
                    </div>
                    {u.id === currentUserId && (
                      <p className="text-xs text-gray-500 mt-1">No puedes cambiar tu estado</p>
                    )}
                  </div>

                  {/* Botones Eliminar y Modificar (Mobile) */}
                  {u.id !== currentUserId && (
                    <div className="pt-3 border-t border-gray-200 space-y-2">
                      <button
                        onClick={() => handleEditUser(u)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-semibold"
                      >
                        <Edit3 className="w-4 h-4" />
                        Modificar Usuario
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(u.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar Usuario
                      </button>
                    </div>
                  )}
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

      {/* Modal Crear Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <UserPlus className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Crear Nuevo Usuario</h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={newUser.nombre}
                  onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  name="rol"
                  value={newUser.rol}
                  onChange={(e) => setNewUser({ ...newUser, rol: e.target.value as Rol })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  required
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Admin</option>
                  <option value="desarrollador">Desarrollador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tienda Asignada
                </label>
                <select
                  name="tienda_id"
                  value={newUser.tienda_id}
                  onChange={(e) => setNewUser({ ...newUser, tienda_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                >
                  <option value="">Sin asignar</option>
                  {tiendas.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Creando...' : 'Crear Usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Confirmar Eliminación</h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-6">
                ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteUser(showDeleteConfirm)}
                  disabled={isPending}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Edit3 className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Modificar Usuario</h2>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(null);
                    setEditUser(null);
                  }}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editUser.email || ''}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={editUser.nombre || ''}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  name="rol"
                  defaultValue={editUser.rol || ''}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  required
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Admin</option>
                  <option value="desarrollador">Desarrollador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tienda Asignada
                </label>
                <select
                  name="tienda_id"
                  defaultValue={editUser.tienda_id?.toString() || ''}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                >
                  <option value="">Sin asignar</option>
                  {tiendas.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Actualizando...' : 'Actualizar Usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(null);
                    setEditUser(null);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}