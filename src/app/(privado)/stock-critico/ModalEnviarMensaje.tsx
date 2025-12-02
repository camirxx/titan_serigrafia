// ModalEnviarMensaje.tsx
'use client';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

type GroupedProduct = {
  diseno: string;
  tipo_prenda: string;
  color: string;
  tallas: Map<string, number>;
  stock_actual: number;
};

type ModalEnviarMensajeProps = {
  isOpen: boolean;
  onClose: () => void;
  productos: GroupedProduct[];
  correoTaller: string;
  umbralActual: number; // ✅ Recibir el umbral de la página principal
};

export default function ModalEnviarMensaje({
  isOpen,
  onClose,
  productos,
  correoTaller,
  umbralActual
}: ModalEnviarMensajeProps) {
  
  // ✅ Permitir que el usuario ELIJA el umbral (inicializado con el de la página)
  const [umbral, setUmbral] = useState<number>(umbralActual);
  const [mensajeExtra, setMensajeExtra] = useState('');
  const [incluyeExcel, setIncluyeExcel] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // ✅ Actualizar umbral cuando cambia el de la página
  useEffect(() => {
    if (isOpen) {
      setUmbral(umbralActual);
    }
  }, [isOpen, umbralActual]);

  // ✅ FILTRAR productos según el umbral ELEGIDO en el modal
  // Esto permite que el usuario ajuste el umbral antes de enviar
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      // Verificar si tiene al menos una talla con stock <= umbral
      return Array.from(p.tallas.values()).some(stock => stock <= umbral);
    });
  }, [productos, umbral]);

  const generarResumenTexto = () => {
    let texto = `Se detectaron ${productosFiltrados.length} productos con stock crítico (≤ ${umbral}).\n\n`;
    
    // Mostrar TODOS los productos en el correo
    productosFiltrados.forEach((p, index) => {
      const tallasTexto = Array.from(p.tallas.entries())
        .map(([talla, stock]) => {
          const critico = stock <= umbral;
          return `${talla}: ${stock}${critico ? ' ⚠️' : ''}`;
        })
        .join(', ');
      
      texto += `${index + 1}. ${p.diseno} - ${p.tipo_prenda} (${p.color})\n`;
      texto += `   Stock total: ${p.stock_actual} | Tallas: ${tallasTexto}\n\n`;
    });

    if (mensajeExtra) {
      texto += `\nMensaje adicional: ${mensajeExtra}`;
    }

    return texto;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!correoTaller) {
      toast.error('No hay correo de taller configurado. Modifícalo en "Modificar correo" primero.');
      return;
    }

    if (productosFiltrados.length === 0) {
      toast.error(`No hay productos con stock crítico (≤ ${umbral})`);
      return;
    }

    setEnviando(true);

    try {
      const body = {
        to: correoTaller,
        subject: `🚨 ALERTA DE STOCK CRÍTICO (≤ ${umbral}) - ${productosFiltrados.length} productos`,
        message: mensajeExtra || `Se detectaron ${productosFiltrados.length} productos con al menos una talla con stock crítico.`,
        includeExcel: incluyeExcel,
        umbral
      };

      const resp = await fetch('/api/enviar-correo-stock-bajo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'Error al enviar correo');

      toast.success(`✅ Alerta enviada correctamente: ${data.totalProductosCriticos} productos notificados`);
      onClose();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar la alerta';
      console.error('Error enviar email:', err);
      toast.error(message);

    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">📦 Notificación de Stock Crítico</h2>
            <p className="text-sm text-purple-100 mt-1">Envía alertas de productos con bajo inventario</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition"
            disabled={enviando}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ✅ Selector de umbral (editable) */}
          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-lg">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎯 Umbral de stock crítico
            </label>
            <div className="flex items-center gap-4">
              <select
                value={umbral}
                onChange={(e) => setUmbral(Number(e.target.value))}
                className="border border-purple-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={enviando}
              >
                <option value={0}>0 (sin stock)</option>
                <option value={1}>≤ 1</option>
                <option value={2}>≤ 2</option>
                <option value={3}>≤ 3</option>
                <option value={4}>≤ 4</option>
                <option value={5}>≤ 5</option>
                <option value={10}>≤ 10</option>
                <option value={15}>≤ 15</option>
                <option value={20}>≤ 20</option>
              </select>
              <span className="text-sm text-gray-600">
                Se incluirán productos con <strong>al menos una talla</strong> igual o menor al umbral
              </span>
            </div>
          </div>

          {/* Resumen de productos */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">📊 Productos a notificar</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                productosFiltrados.length > 0 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {productosFiltrados.length} productos
              </span>
            </div>
            
            {productosFiltrados.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-2 mt-3">
                {productosFiltrados.slice(0, 10).map((p, index) => {
                  const tallasCriticas = Array.from(p.tallas.entries())
                    .filter(([, stock]) => stock <= umbral);
                  
                  const tallasTexto = tallasCriticas.length > 0 
                    ? tallasCriticas.map(([t, s]) => `${t}:${s}`).join(', ')
                    : 'Ninguna';
                  
                  return (
                    <div key={index} className="text-sm bg-gray-50 p-3 rounded-md border border-gray-100">
                      <div className="font-medium text-gray-800">
                        {index + 1}. {p.diseno} - {p.tipo_prenda} ({p.color})
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Stock total: <span className="font-semibold">{p.stock_actual}</span>
                        {' | '}
                        Tallas críticas (≤{umbral}): <span className="font-semibold text-red-600">{tallasTexto}</span>
                      </div>
                    </div>
                  );
                })}
                {productosFiltrados.length > 10 && (
                  <div className="text-xs text-gray-500 text-center pt-2 border-t">
                    + {productosFiltrados.length - 10} productos más...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">No hay productos con stock crítico según el umbral seleccionado</p>
              </div>
            )}
          </div>

          {/* Mensaje personalizado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ✉️ Mensaje personalizado (opcional)
            </label>
            <textarea
              value={mensajeExtra}
              onChange={(e) => setMensajeExtra(e.target.value)}
              rows={4}
              placeholder="Agrega un mensaje personalizado para el correo..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={enviando}
            />
          </div>

          {/* Opciones adicionales */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg">
              <input
                id="incluirExcel"
                checked={incluyeExcel}
                onChange={(e) => setIncluyeExcel(e.target.checked)}
                type="checkbox"
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                disabled={enviando}
              />
              <label htmlFor="incluirExcel" className="text-sm text-gray-700 cursor-pointer">
                📎 Incluir archivo Excel con el reporte completo de stock crítico
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <span className="font-semibold">📧 Destinatario:</span> {correoTaller || <span className="text-red-600 font-bold">⚠️ No configurado</span>}
              </div>
              {!correoTaller && (
                <p className="text-xs text-blue-600 mt-1">Configura el correo del taller antes de enviar</p>
              )}
            </div>
          </div>

          {/* Vista previa del texto */}
          {productosFiltrados.length > 0 && (
            <details className="bg-gray-50 rounded-lg border border-gray-200">
              <summary className="cursor-pointer p-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition">
                👁️ Vista previa del mensaje
              </summary>
              <div className="p-4 border-t border-gray-200">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                  {generarResumenTexto()}
                </pre>
              </div>
            </details>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
              disabled={enviando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={enviando || !correoTaller || productosFiltrados.length === 0}
            >
              {enviando ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  📨 Enviar alerta por correo
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}