"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { X } from "lucide-react";

type Color = { id: number; nombre: string };
type TipoPrenda = { id: number; nombre: string };

type ModalAgregarDisenoProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ModalAgregarDiseno({
  isOpen,
  onClose,
  onSuccess,
}: ModalAgregarDisenoProps) {
  const supabase = supabaseBrowser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // form
  const [nombreDiseno, setNombreDiseno] = useState("");
  const [coloresSeleccionados, setColoresSeleccionados] = useState<number[]>([]);
  const [tiposSeleccionados, setTiposSeleccionados] = useState<number[]>([]);

  // catálogos
  const [coloresDisponibles, setColoresDisponibles] = useState<Color[]>([]);
  const [tiposDisponibles, setTiposDisponibles] = useState<TipoPrenda[]>([]);

  // --- cargar catálogos ---
  const cargarCatalogos = useCallback(async () => {
    try {
      const { data: colores, error: e1 } = await supabase
        .from("colores")
        .select("id, nombre")
        .order("nombre");
      if (e1) throw e1;
      setColoresDisponibles((colores ?? []) as Color[]);

      const { data: tipos, error: e2 } = await supabase
        .from("tipos_prenda")
        .select("id, nombre")
        .order("nombre");
      if (e2) throw e2;
      setTiposDisponibles((tipos ?? []) as TipoPrenda[]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error cargando catálogos";
      setError(message);
    }
  }, [supabase]);

  // al abrir modal
  useEffect(() => {
    if (!isOpen) return;
    setOk(null);
    setError(null);
    cargarCatalogos();
  }, [isOpen, cargarCatalogos]);

  const toggleColor = (id: number) =>
    setColoresSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleTipo = (id: number) =>
    setTiposSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // 🔥 TIENDA FIJA = 1
  const TIENDA_CENTRAL = 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!nombreDiseno.trim()) {
      setError("Debes ingresar un nombre para el diseño");
      return;
    }
    if (tiposSeleccionados.length === 0) {
      setError("Selecciona al menos un tipo de prenda");
      return;
    }
    if (coloresSeleccionados.length === 0) {
      setError("Selecciona al menos un color");
      return;
    }

    setLoading(true);
    try {
      // 1) Upsert diseño
      const { data: disenoRow, error: eUpsert } = await supabase
        .from("disenos")
        .upsert({ nombre: nombreDiseno.trim() }, { onConflict: "nombre" })
        .select("id")
        .single();
      if (eUpsert) throw eUpsert;
      const disenoId = disenoRow.id as number;

      // 2) Crear productos (siempre tienda_id = 1)
      const productosACrear = [];

      for (const tipoId of tiposSeleccionados) {
        for (const colorId of coloresSeleccionados) {
          productosACrear.push({
            diseno_id: disenoId,
            tipo_prenda_id: tipoId,
            color_id: colorId,
            tienda_id: TIENDA_CENTRAL, // 🔥 FIJO
            activo: true,
          });
        }
      }

      const { data: productosNew, error: eInsProd } = await supabase
        .from("productos")
        .insert(productosACrear)
        .select("id");

      if (eInsProd) throw eInsProd;

      const productoIds = (productosNew ?? []).map((p) => p.id as number);
      if (productoIds.length === 0) {
        throw new Error(
          "No se obtuvieron IDs de productos (verifica RLS de SELECT)."
        );
      }

      // 3) variantes
      const tallas = ["S", "M", "L", "XL", "XXL", "XXXL"];
      const variantesACrear: {
        producto_id: number;
        talla: string;
        stock_actual: number;
        costo_unitario: number;
      }[] = [];

      for (const pid of productoIds) {
        for (const talla of tallas) {
          variantesACrear.push({
            producto_id: pid,
            talla,
            stock_actual: 0,
            costo_unitario: 0,
          });
        }
      }

      const { error: eInsVar } = await supabase
        .from("variantes")
        .insert(variantesACrear);

      if (eInsVar) throw eInsVar;

      setOk("✅ Diseño y variantes creadas correctamente");
      onSuccess();
      limpiarFormulario();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al crear el diseño";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setNombreDiseno("");
    setColoresSeleccionados([]);
    setTiposSeleccionados([]);
    setError(null);
    setOk(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-2xl font-bold">Agregar Nuevo Diseño</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded">
              {error}
            </div>
          )}
          {ok && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded">
              {ok}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del Diseño *
            </label>
            <input
              type="text"
              value={nombreDiseno}
              onChange={(e) => setNombreDiseno(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500"
              placeholder="Ej: Kirby morado…"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tipos de Prenda *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {tiposDisponibles.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                    tiposSeleccionados.includes(t.id)
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tiposSeleccionados.includes(t.id)}
                    onChange={() => toggleTipo(t.id)}
                    className="w-5 h-5"
                    disabled={loading}
                  />
                  <span className="font-medium text-gray-700">{t.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Colores *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {coloresDisponibles.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition ${
                    coloresSeleccionados.includes(c.id)
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={coloresSeleccionados.includes(c.id)}
                    onChange={() => toggleColor(c.id)}
                    className="w-5 h-5"
                    disabled={loading}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {c.nombre}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {tiposSeleccionados.length > 0 &&
            coloresSeleccionados.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                Se crearán: <b>{tiposSeleccionados.length}</b> ×{" "}
                <b>{coloresSeleccionados.length}</b> ={" "}
                <b>
                  {tiposSeleccionados.length *
                    coloresSeleccionados.length}{" "}
                  productos
                </b>{" "}
                (cada uno con 6 tallas)
              </div>
            )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg disabled:opacity-50"
            >
              {loading ? "Creando…" : "Crear Diseño"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
