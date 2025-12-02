'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

type ModalModCorreoProps = {
  isOpen: boolean;
  onClose: () => void;
  correoActualProp: string;
  onSuccess?: (nuevoCorreo: string) => void;
};

export default function ModalModCorreo({ 
  isOpen, 
  onClose, 
  correoActualProp, 
  onSuccess 
}: ModalModCorreoProps) {
  const [correoActual, setCorreoActual] = useState(correoActualProp);
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [confirmarCorreo, setConfirmarCorreo] = useState('');
  const [cargando, setCargando] = useState(true); // ← Ahora sí cambia
  const [guardando, setGuardando] = useState(false);

  const TABLE = 'configuracion_taller';
  const CONFIG_ID = 1;

  useEffect(() => {
    if (isOpen) {
      setCorreoActual(correoActualProp);
      setNuevoCorreo(correoActualProp);
      setConfirmarCorreo(correoActualProp);
      setCargando(false); // ← ¡EL FIX!
    }
  }, [isOpen, correoActualProp]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nuevoCorreo) return toast.error('Ingrese un correo válido');
    if (nuevoCorreo !== confirmarCorreo) return toast.error('Los correos no coinciden');

    setGuardando(true);

    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert(
          {
            id: CONFIG_ID,
            correo: nuevoCorreo,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );

      if (error) throw error;

      toast.success('Correo actualizado correctamente');
      onSuccess?.(nuevoCorreo);
      onClose();
    } catch (err) {
      console.error('Error guardando correo:', err);
      toast.error('Error al guardar el correo');
    } finally {
      setGuardando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold">Modificar correo del taller</h2>
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
            <div className="flex justify-center py-16">
              <div className="animate-spin w-10 h-10 border-4 border-purple-300 border-t-purple-700 rounded-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">Correo actual</label>
                <div className="mt-1 bg-gray-100 border border-gray-300 text-black p-3 rounded-lg font-medium">
                  {correoActual || 'No configurado'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Nuevo correo *</label>
                <input
                  type="email"
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="nuevo@correo.com"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Confirmar correo *</label>
                <input
                  type="email"
                  value={confirmarCorreo}
                  onChange={(e) => setConfirmarCorreo(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="Repetir correo"
                  required
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={guardando}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}