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
<<<<<<< HEAD
  umbralActual: number;
=======
>>>>>>> parent of 1a99f2d (prueba 4 final)
};

export default function ModalEnviarMensaje({
  isOpen,
  onClose,
  productos,
  correoTaller
}: ModalEnviarMensajeProps) {
<<<<<<< HEAD
=======
  
  // Detectar el umbral actual desde los productos filtrados
  const umbralActual = useMemo(() => {
    // Buscar el umbral más común en los productos (el que está en la URL o filtro actual)
    const stocks = productos.flatMap(p => Array.from(p.tallas.values()));
    const maxStock = Math.max(...stocks.filter(s => s <= 10), 1);
    return maxStock <= 5 ? maxStock : 5;
  }, [productos]);
>>>>>>> parent of 1a99f2d (prueba 4 final)

  const [umbral, setUmbral] = useState<number>(umbralActual);
  const [mensajeExtra, setMensajeExtra] = useState('');
  const [incluyeExcel, setIncluyeExcel] = useState(true);
  const [enviando, setEnviando] = useState(false);

<<<<<<< HEAD
  useEffect(() => {
    if (isOpen) {
      setUmbral(umbralActual);
    }
  }, [isOpen, umbralActual]);

  // 🔥 FILTRA EXACTAMENTE IGUAL que la vista previa
  const productosFiltrados = useMemo(() => {
    return productos.filter(p =>
      Array.from(p.tallas.values()).some(stock => stock <= umbral)
    );
  }, [productos, umbral]);

  // 🔥 ESTE TEXTO SE MANDARÁ AL BACKEND
  const mensajeParaCorreo = useMemo(() => {
    const generarResumenTexto = () => {
      let texto = `Se han detectado ${productosFiltrados.length} productos con stock crítico (≤ ${umbral} unidades):\n\n`;
=======
  // Filtrar productos que tengan AL MENOS UNA talla con stock <= umbral
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      // Verifica si al menos una talla tiene stock <= umbral
      return Array.from(p.tallas.values()).some(stock => stock <= umbral);
    });
  }, [productos, umbral]);

  const generarResumenTexto = () => {
    let texto = `Se detectaron ${productosFiltrados.length} productos con stock crítico (≤ ${umbral}).\n\n`;
    
    productosFiltrados.slice(0, 50).forEach((p, index) => {
      const tallasTexto = Array.from(p.tallas.entries())
        .map(([talla, stock]) => {
          const critico = stock <= umbral;
          return `${talla}: ${stock}${critico ? ' ⚠️' : ''}`;
        })
        .join(', ');
      
      texto += `${index + 1}. ${p.diseno} - ${p.tipo_prenda} (${p.color})\n`;
      texto += `   Stock total: ${p.stock_actual} | Tallas: ${tallasTexto}\n\n`;
    });
>>>>>>> parent of 1a99f2d (prueba 4 final)

      productosFiltrados.forEach((p, index) => {
        const tallasTexto = Array.from(p.tallas.entries())
          .map(([talla, stock]) => `${talla}: ${stock}`)
          .join(', ');

        texto += `${index + 1}. ${p.diseno} - ${p.tipo_prenda} (${p.color})\n`;
        texto += `   Stock total: ${p.stock_actual} | Tallas: ${tallasTexto}\n\n`;
      });

      if (mensajeExtra) {
        texto += `\nMensaje adicional: ${mensajeExtra}`;
      }

      return texto;
    };

    return generarResumenTexto();
  }, [productosFiltrados, mensajeExtra, umbral]);

  // 🔥 PREPARA LOS PRODUCTOS COMPLETOS PARA ENVIAR AL BACKEND
  const productosParaEnviar = productosFiltrados.map((p) => ({
    nombre: p.diseno,
    tipo_prenda: p.tipo_prenda,
    color: p.color,
    stock_total: p.stock_actual,
    todas_variantes: Array.from(p.tallas.entries()).map(([talla, stock]) => ({
      talla,
      stock_actual: stock,
      es_critico: stock <= umbral
    }))
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correoTaller) {
      toast.error('No hay correo de taller configurado.');
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
        subject: `🚨 ALERTA DE STOCK CRÍTICO (≤ ${umbral})`,
        message: mensajeParaCorreo, // ✔ ENVÍA TODO EL TEXTO COMPLETO
        productosCompletos: productosParaEnviar, // ✔ ENVÍA TODAS LAS TALLAS
        umbral,
        includeExcel: incluyeExcel
      };

      const resp = await fetch('/api/enviar-correo-stock-bajo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'Error al enviar correo');

      toast.success(`Alerta enviada correctamente`);
      onClose();

    } catch (err: unknown) {
      console.error('Error enviar email:', err);
      toast.error('Error al enviar la alerta');

    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        
        {/* HEADER */}
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

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

<<<<<<< HEAD
          {/* UMBRAL */}
=======
          {/* Umbral de stock */}
>>>>>>> parent of 1a99f2d (prueba 4 final)
          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-lg">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎯 Umbral de stock crítico
            </label>
            <div className="flex items-center gap-4">
              <select
                value={umbral}
                onChange={(e) => setUmbral(Number(e.target.value))}
                className="border border-purple-300 rounded-lg px-4 py-2"
                disabled={enviando}
              >
                <option value={0}>0 (sin stock)</option>
                <option value={1}>≤ 1</option>
                <option value={2}>≤ 2</option>
                <option value={3}>≤ 3</option>
                <option value={4}>≤ 4</option>
                <option value={5}>≤ 5</option>
                <option value={10}>≤ 10</option>
              </select>
              <span className="text-sm text-gray-600">
                Se incluirán productos con <strong>al menos una talla</strong> igual o menor al umbral
              </span>
            </div>
          </div>

          {/* LISTA DE PRODUCTOS */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">📊 Productos a notificar</h3>
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                {productosFiltrados.length} productos
              </span>
            </div>

            {productosFiltrados.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-2 mt-3">
                {productosFiltrados.map((p, index) => {
                  const tallasCriticas = Array.from(p.tallas.entries())
                    .filter(([, stock]) => stock <= umbral);
<<<<<<< HEAD

                  const tallasTexto = tallasCriticas.length > 0
                    ? tallasCriticas.map(([t, s]) => `${t}:${s}`).join(', ')
                    : 'Ninguna';

=======
                  
>>>>>>> parent of 1a99f2d (prueba 4 final)
                  return (
                    <div key={index} className="text-sm bg-gray-50 p-3 rounded-md border border-gray-100">
                      <div className="font-medium text-gray-800">
                        {index + 1}. {p.diseno} - {p.tipo_prenda} ({p.color})
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Stock total: <span className="font-semibold">{p.stock_actual}</span> | 
                        Tallas críticas: {tallasCriticas.map(([t, s]) => `${t}:${s}`).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No hay productos con stock crítico
              </div>
            )}
          </div>

          {/* MENSAJE PERSONALIZADO */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ✉️ Mensaje personalizado (opcional)
            </label>
            <textarea
              value={mensajeExtra}
              onChange={(e) => setMensajeExtra(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              disabled={enviando}
            />
          </div>

          {/* VISTA PREVIA */}
          {productosFiltrados.length > 0 && (
            <details className="bg-gray-50 rounded-lg border border-gray-200">
              <summary className="cursor-pointer p-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
                👁️ Vista previa del mensaje
              </summary>
              <div className="p-4 border-t border-gray-200">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                  {mensajeParaCorreo}
                </pre>
              </div>
            </details>
          )}

          {/* OPCIONES */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg">
              <input
                id="incluirExcel"
                checked={incluyeExcel}
                onChange={(e) => setIncluyeExcel(e.target.checked)}
                type="checkbox"
                className="w-4 h-4"
                disabled={enviando}
              />
              <label htmlFor="incluirExcel" className="text-sm text-gray-700 cursor-pointer">
                📎 Incluir archivo Excel con el reporte completo
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <span className="font-semibold">📧 Destinatario:</span> {correoTaller}
              </div>
            </div>
          </div>

          {/* BOTONES */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg"
              disabled={enviando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg"
              disabled={enviando || !correoTaller}
            >
              {enviando ? 'Enviando...' : 'Enviar alerta'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
