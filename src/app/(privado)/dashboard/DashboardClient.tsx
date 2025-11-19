"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ShoppingCart } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Package, RotateCcw } from "lucide-react";

type VentasSemana = {
  tienda_id: number;
  semana: string;
  venta_total: number;
  costo_total: number;
  ganancia: number;
};

type TopDiseno = {
  tienda_id: number;
  diseno: string;
  unidades: number;
  venta_total: number;
};

type Tienda = {
  id: number;
  nombre: string;
};

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [tiendaId, setTiendaId] = useState<number | "">("");
  const [from, setFrom] = useState<string>(""); // Changed from Date to string
  const [to, setTo] = useState<string>(""); // Changed from Date to string
  const [semanas, setSemanas] = useState<VentasSemana[]>([]);
  const [top, setTop] = useState<TopDiseno[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechaActual, setFechaActual] = useState("");
  const [horaActual, setHoraActual] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tiendas")
        .select("id, nombre")
        .order("id", { ascending: true });
      if (!error && data) {
        setTiendas(data as Tienda[]);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setFechaActual(
        now.toLocaleDateString("es-CL", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
      setHoraActual(
        now.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let ventas = supabase.from("v_dash_ventas_semana").select("*");
        if (tiendaId !== "") ventas = ventas.eq("tienda_id", tiendaId);
        if (from) ventas = ventas.gte("semana", from);
        if (to) ventas = ventas.lte("semana", to);

        const ventasResponse = await ventas;
        if (ventasResponse.error) throw ventasResponse.error;
        setSemanas((ventasResponse.data ?? []) as VentasSemana[]);

        const topResponse = await supabase.rpc("top_disenos_rango", {
          p_tienda_id: tiendaId === "" ? null : Number(tiendaId),
          p_desde: from || null,
          p_hasta: to || null,
          p_limit: 20,
        });
        if (topResponse.error) throw topResponse.error;
        setTop((topResponse.data ?? []) as TopDiseno[]);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Error cargando el dashboard",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, tiendaId, from, to]);

  const dataSemanas = useMemo(
    () =>
      semanas.map((item) => ({
        ...item,
        semanaLabel: new Date(item.semana).toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
        }),
      })),
    [semanas],
  );

  const totalVentas = useMemo(
    () => semanas.reduce((acc, item) => acc + (item.venta_total ?? 0), 0),
    [semanas],
  );

  const totalProductosVendidos = useMemo(
    () => top.reduce((acc, item) => acc + (item.unidades ?? 0), 0),
    [top],
  );

  const totalDevoluciones = useMemo(
    () =>
      semanas.reduce((acc, item) => {
        const devolucion = item.costo_total - item.ganancia;
        return acc + (devolucion > 0 ? devolucion : 0);
      }, 0),
    [semanas],
  );

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">Dashboard — Ventas Diarias</h1>
              <p className="text-white/80 text-sm mt-1">
                {fechaActual}{fechaActual && " · "}{horaActual}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10 pt-6 pb-6">
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Ventas Totales"
              value={`$${totalVentas.toLocaleString("es-CL")}`}
              change="+12.5% vs ayer"
              tone="success"
              icon={<ShoppingCart className="h-8 w-8" />}
            />
            <MetricCard
              title="Productos Vendidos"
              value={totalProductosVendidos.toLocaleString("es-CL")}
              change="+8.3% vs ayer"
              tone="info"
              icon={<Package className="h-8 w-8" />}
            />
            <MetricCard
              title="Devoluciones"
              value={totalDevoluciones.toLocaleString("es-CL")}
              change="-15% vs ayer"
              tone="danger"
              icon={<RotateCcw className="h-8 w-8" />}
            />
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white/95 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="mb-2 block text-sm font-semibold text-gray-700">🏪 Tienda</label>
                <select
                  className="w-full rounded-xl border-2 border-gray-200 p-3 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={tiendaId === "" ? "" : String(tiendaId)}
                  onChange={(event) =>
                    setTiendaId(event.target.value === "" ? "" : Number(event.target.value))
                  }
                >
                  <option value="">Todas</option>
                  {tiendas.map((tienda) => (
                    <option key={tienda.id} value={tienda.id}>
                      {tienda.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="mb-2 block text-sm font-semibold text-gray-700">📅 Desde</label>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-gray-200 p-3 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="mb-2 block text-sm font-semibold text-gray-700">📅 Hasta</label>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-gray-200 p-3 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3">
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600" />
                    <span className="text-sm font-medium text-indigo-600">Cargando...</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-gray-700">Actualizado</span>
                  </>
                )}
              </div>
            </div>
          </section>

          {error ? (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 text-rose-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          ) : null}

          <section className="rounded-2xl border border-gray-100 bg-white/95 p-8 shadow-xl backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 shadow-lg">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Ventas y Ganancia</h2>
                <p className="text-sm text-gray-500">Evolución semanal</p>
              </div>
            </div>
            <div className="h-80 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataSemanas}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="semanaLabel" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 20 }} />
                  <Area
                    type="monotone"
                    dataKey="venta_total"
                    name="Ventas"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#colorVentas)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ganancia"
                    name="Ganancia"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#colorGanancia)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white/95 p-8 shadow-xl backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-pink-500 to-orange-600 p-3 shadow-lg">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 3v18m0-18c-1.5 0-3 1-4 2.5M12 3c1.5 0 3 1 4 2.5M8 5.5C6 7 5 9 5 11c0 3 2 5 4 6m8-6c0-2-1-4-3-5.5M17 11c0 2-1 4-3 5.5" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Top Diseños</h2>
                <p className="text-sm text-gray-500">Los más vendidos</p>
              </div>
            </div>
            <div className="mb-4 h-80 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="diseno" hide />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 20 }} />
                  <Bar dataKey="unidades" name="Unidades" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {top.map((item, index) => (
                <div
                  key={`${item.diseno}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-pink-100 bg-gradient-to-r from-pink-50 to-orange-50 p-3 shadow-sm transition hover:shadow-md"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-800">{item.diseno}</p>
                    <p className="text-sm text-gray-600">{item.unidades} unidades</p>
                  </div>
                </div>
              ))}
              {top.length === 0 ? (
                <div className="col-span-full py-8 text-center text-gray-500">
                  <svg className="mx-auto mb-3 h-16 w-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="font-medium">Sin datos disponibles</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  tone: "success" | "info" | "danger";
};

function MetricCard({ title, value, change, icon, tone }: MetricCardProps) {
  const toneClasses = {
    success: "bg-emerald-500/10 text-emerald-600",
    info: "bg-sky-500/10 text-sky-600",
    danger: "bg-rose-500/10 text-rose-500",
  } as const;

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center justify-between">
        <span className={cn("rounded-xl p-3", toneClasses[tone])}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hoy</span>
      </div>
      <h3 className="mt-5 text-sm font-semibold text-slate-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p
        className={cn(
          "mt-3 text-sm font-semibold",
          tone === "danger" ? "text-rose-500" : "text-emerald-600"
        )}
      >
        {change}
      </p>
    </article>
  );
}
