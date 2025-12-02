// ModalEnviarMensaje.tsx
'use client';
import { useState, useMemo } from 'react';
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
};

export default function ModalEnviarMensaje({
  isOpen,
  onClose,
  productos,
  correoTaller
}: ModalEnviarMensajeProps) {
  
  const [umbral, setUmbral] = useState<number>(5);
  const [mensajeExtra, setMensajeExtra] = useState('');
  const [incluyeExcel, setIncluyeExcel] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p =>
      Array.from(p.tallas.values()).some(stock => stock <= umbral)
    );
  }, [productos, umbral]);

  const generarHtmlResumen = () => {
    let html = `<h2>🚨 Alerta de stock crítico (≤ ${umbral})</h2>`;
    html += `<p>Se detectaron <strong>${productosFiltrados.length}</strong> productos con stock crítico.</p>`;
    html += '<ul>';

    productosFiltrados.slice(0, 50).forEach((p) => {
      html += `<li><strong>${p.diseno}</strong> — ${p.tipo_prenda} (${p.color}) — Total: ${p.stock_actual}<br/>Tallas: `;
      html += Array.from(p.tallas.entries())
        .filter(([, stock]) => stock <= umbral)
        .map(([t, stock]) => `${t}: ${stock}`)
        .join(', ');
      html += '</li>';
    });

    html += '</ul>';

    if (mensajeExtra) html += `<p><em>Mensaje: ${mensajeExtra}</em></p>`;

    return html;
  };

  function generateSafeHtml() {
    return generarHtmlResumen();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!correoTaller) {
      toast.error('No hay correo de taller configurado. Modifícalo en "Modificar correo" primero.');
      return;
    }

    setEnviando(true);

    try {
      const body = {
        to: correoTaller,
        subject: `🚨 ALERTA DE STOCK CRÍTICO (≤ ${umbral})`,
        message: `${mensajeExtra}\n\nProductos críticos: ${productosFiltrados.length}`,
        html: generateSafeHtml(),
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

      toast.success('Alerta enviada correctamente');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-2xl font-bold">📦 Notificación de Stock Crítico</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Umbral de stock (≤)
            </label>
            <select
              value={umbral}
              onChange={(e) => setUmbral(Number(e.target.value))}
              className="border rounded-lg px-3 py-2"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Se incluirán productos con alguna talla igual o menor al umbral.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Mensaje personalizado (opcional)
            </label>
            <textarea
              value={mensajeExtra}
              onChange={(e) => setMensajeExtra(e.target.value)}
              rows={4}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="incluirExcel"
              checked={incluyeExcel}
              onChange={(e) => setIncluyeExcel(e.target.checked)}
              type="checkbox"
              className="w-4 h-4"
            />
            <label htmlFor="incluirExcel" className="text-sm text-gray-700">
              Incluir reporte Excel con productos de stock bajo
            </label>
          </div>

          <div className="text-sm text-gray-600">
            Se enviará a: <strong>{correoTaller || '— (configura el correo del taller)'}</strong>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md"
              disabled={enviando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md"
              disabled={enviando}
            >
              {enviando ? 'Enviando...' : 'Enviar alerta por correo'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
