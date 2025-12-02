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

export default function ModalModCorreo({ isOpen, onClose, correoActualProp, onSuccess }: ModalModCorreoProps) {
  const [correoActual, setCorreoActual] = useState(correoActualProp);
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [confirmarCorreo, setConfirmarCorreo] = useState('');
  const [cargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const TABLE = 'configuracion_taller';
  const CONFIG_ID = 1;

  useEffect(() => {
    if (isOpen) {
      setCorreoActual(correoActualProp);
      setNuevoCorreo(correoActualProp);
      setConfirmarCorreo(correoActualProp);
    }
  }, [isOpen, correoActualProp]);

  // No necesitamos cargar el correo ya que lo recibimos como prop

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nuevoCorreo) return toast.error('Ingrese un correo válido');
    if (nuevoCorreo !== confirmarCorreo) return toast.error('Los correos no coinciden');

    setGuardando(true);

    try {
      const res = await supabase
        .from(TABLE)
        .upsert(
          {
            id: CONFIG_ID,
            correo: nuevoCorreo,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      console.log('[ModalModCorreo] upsert:', res);

      if (res.error) {
        toast.error('No se pudo guardar el correo');
        return;
      }

      toast.success('Correo actualizado correctamente');
      onSuccess?.(nuevoCorreo);
      onClose();
    } catch (err) {
      console.error('Error guardando correo (catch):', err);
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
          <h2 className="text-xl font-bold">Modificar correo del taller</h2>

          <button
            onClick={onClose}
            disabled={guardando}
            className="p-2 hover:bg-white/20 rounded-full"
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
              <div>
                <label className="text-sm font-medium text-gray-700">Correo actual</label>
                <div className="mt-1 bg-gray-100 border text-black p-3 rounded-lg">
                  {correoActual || 'No configurado'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Nuevo correo *</label>
                <input
                  type="email"
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Confirmar correo *</label>
                <input
                  type="email"
                  value={confirmarCorreo}
                  onChange={(e) => setConfirmarCorreo(e.target.value)}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border p-3 rounded-lg"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-purple-600 text-white p-3 rounded-lg"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
