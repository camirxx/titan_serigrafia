'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

type ModalModCorreoProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (nuevoCorreo: string) => void;
  correoActualProp?: string; // Recibir correo actual como prop
};

export default function ModalModCorreo({ 
  isOpen, 
  onClose, 
  onSuccess,
  correoActualProp 
}: ModalModCorreoProps) {
  const [correoActual, setCorreoActual] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [confirmarCorreo, setConfirmarCorreo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const TABLE = 'configuracion_taller';
  const CONFIG_ID = 1;

  useEffect(() => {
    if (isOpen) {
      cargarCorreo();
    } else {
      // Reset form cuando se cierra
      setNuevoCorreo('');
      setConfirmarCorreo('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function cargarCorreo() {
    try {
      setCargando(true);

      // Si viene el correo como prop, usarlo directamente
      if (correoActualProp) {
        setCorreoActual(correoActualProp);
        setNuevoCorreo(correoActualProp);
        setConfirmarCorreo(correoActualProp);
        setCargando(false);
        return;
      }

      // Si no, cargarlo de la BD
      const res = await supabase
        .from(TABLE)
        .select('correo')
        .eq('id', CONFIG_ID)
        .maybeSingle(); // Usar maybeSingle en lugar de single para evitar error si no existe

      console.log('[ModalModCorreo] cargarCorreo()', res);

      if (res.error && res.error.code !== 'PGRST116') {
        // PGRST116 = no rows found, es normal la primera vez
        console.error('[ModalModCorreo] Error:', res.error);
        toast.error('Error cargando correo');
        return;
      }

      const correo = res.data?.correo ?? '';

      setCorreoActual(correo);
      setNuevoCorreo(correo);
      setConfirmarCorreo(correo);
    } catch (err) {
      console.error('[ModalModCorreo] excepción:', err);
      toast.error('Error inesperado cargando correo');
    } finally {
      setCargando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nuevoCorreo) return toast.error('Ingrese un correo válido');
    if (nuevoCorreo !== confirmarCorreo) return toast.error('Los correos no coinciden');
    
    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nuevoCorreo)) {
      return toast.error('Ingrese un correo válido');
    }

    setGuardando(true);

    try {
      const ahora = new Date().toISOString();
      
      const res = await supabase
        .from(TABLE)
        .upsert(
          {
            id: CONFIG_ID,
            correo: nuevoCorreo,
            updated_at: ahora
          },
          { onConflict: 'id' }
        )
        .select()
        .maybeSingle();

      console.log('[ModalModCorreo] upsert:', res);

      if (res.error) {
        console.error('[ModalModCorreo] Error guardando:', res.error);
        toast.error('No se pudo guardar el correo');
        return;
      }

      toast.success('✅ Correo actualizado correctamente');
      
      // Llamar callback con el nuevo correo
      if (onSuccess) {
        onSuccess(nuevoCorreo);
      }
      
      onClose();
    } catch (err) {
      console.error('[ModalModCorreo] Error guardando correo (catch):', err);
      toast.error('Error inesperado guardando correo');
    } finally {
      setGuardando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📧 Configurar correo del taller</h2>
            <p className="text-sm text-purple-100 mt-1">Para notificaciones de stock crítico</p>
          </div>

          <button
            onClick={onClose}
            disabled={guardando}
            className="p-2 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {cargando ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin w-10 h-10 border-4 border-purple-300 border-t-purple-700 rounded-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {correoActual && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="text-sm font-semibold text-blue-900">📬 Correo actual</label>
                  <div className="mt-2 text-blue-700 font-medium">
                    {correoActual}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nuevo correo electrónico *
                </label>
                <input
                  type="email"
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  placeholder="ejemplo@taller.com"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  disabled={guardando}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar correo *
                </label>
                <input
                  type="email"
                  value={confirmarCorreo}
                  onChange={(e) => setConfirmarCorreo(e.target.value)}
                  placeholder="ejemplo@taller.com"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  disabled={guardando}
                />
                {nuevoCorreo && confirmarCorreo && nuevoCorreo !== confirmarCorreo && (
                  <p className="text-sm text-red-600 mt-1">⚠️ Los correos no coinciden</p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  💡 <strong>Importante:</strong> Este correo se usará para enviar todas las notificaciones 
                  de stock crítico automáticamente.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={guardando}
                  className="flex-1 border border-gray-300 p-3 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando || (nuevoCorreo !== confirmarCorreo)}
                  className="flex-1 bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {guardando ? 'Guardando…' : '💾 Guardar correo'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}