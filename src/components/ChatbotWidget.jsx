"use client";

import { useEffect, useMemo, useState } from "react";

const MENUS = {
  main: {
    title: "🤖 Asistente de Inventario",
    subtitle: "Selecciona una categoría para continuar:",
    options: [
      { label: "📦 Inventario", action: { type: "menu", target: "inventory" } },
      { label: "🔄 Movimientos", action: { type: "menu", target: "movements" } },
      { label: "🚨 Alertas", action: { type: "menu", target: "alerts" } },
      { label: "📊 Resumen del día", action: { type: "menu", target: "summary" } },
      { label: "🛠 Configuración", action: { type: "menu", target: "settings" } },
      { label: "❓ Ayuda", action: { type: "menu", target: "help" } },
    ],
  },
  inventory: {
    title: "📦 Inventario",
    subtitle: "Acciones rápidas disponibles:",
    options: [
      { label: "📋 Ver inventario completo", action: { type: "api", key: "stockTotal" } },
      { label: "🔍 Buscar producto", action: { type: "info", title: "🔍 Buscar producto", lines: [
        "Selecciona un producto de la lista predefinida:",
        "• Tinta UV Azul — Código TUV-1023",
        "• Polera Premium Negra — Código POL-NG-210",
        "• Transfer Textil Blanco — Código TRF-BL-441",
        "Utiliza las categorías para filtrar resultados rápidamente.",
      ] } },
      { label: "🏷️ Ver por categoría", action: { type: "info", title: "🏷️ Categorías", lines: [
        "• Tintas y Químicos",
        "• Textiles y Prendas",
        "• Insumos de Transferencia",
        "• Promocionales",
        "Selecciona una categoría para ver destacados en el inventario.",
      ] } },
      { label: "❗ Ver stock bajo", action: { type: "api", key: "stockLow" } },
      { label: "⬅️ Volver", action: { type: "back" } },
    ],
  },
  movements: {
    title: "🔄 Movimientos",
    subtitle: "Selecciona la opción que necesitas:",
    options: [
      { label: "➕ Registrar ingreso", action: { type: "info", title: "➕ Registrar ingreso", lines: [
        "1. Ingresa al módulo POS o Inventario.",
        "2. Selecciona el producto y la cantidad recibida.",
        "3. Confirma el origen y guarda para actualizar stock.",
      ] } },
      { label: "➖ Registrar salida", action: { type: "info", title: "➖ Registrar salida", lines: [
        "1. Ingresa al detalle del producto.",
        "2. Registra la cantidad retirada y destino.",
        "3. Confirma para registrar en el historial.",
      ] } },
      { label: "📅 Movimientos del día", action: { type: "api", key: "movementsDay" } },
      { label: "📆 Movimientos del mes", action: { type: "api", key: "movementsMonth" } },
      { label: "⬅️ Volver", action: { type: "back" } },
    ],
  },
  alerts: {
    title: "🚨 Alertas y Notificaciones",
    subtitle: "Gestiona alertas de stock en segundos:",
    options: [
      { label: "🚨 Ver productos críticos", action: { type: "api", key: "criticalProducts" } },
      { label: "⚠️ Enviar alerta", action: { type: "menu", target: "alertsSend" } },
      { label: "🛎️ Configurar umbral", action: { type: "info", title: "🛎️ Configurar umbral", lines: [
        "1. Accede a Configuración > Inventario.",
        "2. Ajusta el nivel mínimo por producto o categoría.",
        "3. Guarda para activar alertas automáticas.",
      ] } },
      { label: "⬅️ Volver", action: { type: "back" } },
    ],
  },
  alertsSend: {
    title: "⚠️ Enviar alerta de stock bajo",
    subtitle: "Selecciona un canal disponible:",
    options: [
      { label: "📧 Enviar por correo", action: { type: "api", key: "sendEmail", stay: false } },
      { label: "📱 Enviar por WhatsApp", action: { type: "api", key: "sendWhatsapp", stay: false } },
      { label: "⬅️ Volver", action: { type: "back" } },
    ],
  },
  summary: {
    title: "📊 Resumen del Día",
    subtitle: "Información consolidada del día:",
    options: [
      { label: "📅 Ver resumen mensual", action: { type: "api", key: "summaryMonth", stay: true } },
      { label: "⬅️ Volver", action: { type: "back" } },
    ],
  },
  settings: {
    title: "🛠 Configuración",
    subtitle: "Accesos directos de ajustes:",
    options: [
      { label: "🌙 Alternar modo oscuro", action: { type: "toggleTheme" } },
      { label: "📱 Actualizar WhatsApp", action: { type: "info", title: "📱 Actualizar WhatsApp", lines: [
        "1. Ve a Configuración > Notificaciones.",
        "2. Ingresa el nuevo número autorizado.",
        "3. Guarda para activar el envío de alertas.",
      ] } },
      { label: "📧 Actualizar correo", action: { type: "info", title: "📧 Actualizar correo", lines: [
        "1. Ve a Configuración > Contacto.",
        "2. Ingresa el nuevo correo y confirma.",
        "3. Verifica el mensaje de confirmación enviado.",
      ] } },
      { label: "⬅️ Volver", action: { type: "back" } },
    ],
  },
  help: {
    title: "❓ Ayuda",
    subtitle: "Guías rápidas paso a paso:",
    options: [
      { label: "¿Cómo registrar entrada?", action: { type: "info", title: "Registrar entrada", lines: [
        "1. Abre Inventario > Registrar ingreso.",
        "2. Selecciona producto y cantidades.",
        "3. Confirma el origen y guarda.",
      ] } },
      { label: "¿Cómo ver stock bajo?", action: { type: "info", title: "Ver stock bajo", lines: [
        "Usa Inventario > Stock bajo para revisar productos críticos.",
        "Activa alertas automáticas para recibir notificaciones.",
      ] } },
      { label: "¿Cómo enviar alerta?", action: { type: "info", title: "Enviar alertas", lines: [
        "1. Ve a Alertas y Notificaciones.",
        "2. Selecciona Enviar alerta de stock bajo.",
        "3. Elige correo o WhatsApp y confirma.",
      ] } },
      { label: "¿Cómo buscar producto?", action: { type: "info", title: "Buscar producto", lines: [
        "1. Ingresa a Inventario > Buscar producto.",
        "2. Filtra por categoría o estado.",
        "3. Visualiza stock disponible y ubicación.",
      ] } },
      { label: "⬅️ Volver", action: { type: "back" } },
    ],
  },
};

const API_ACTIONS = {
  stockTotal: {
    endpoint: "/api/stock-total",
    method: "GET",
    format: (data) => ({
      title: "📋 Inventario completo",
      lines: [
        `Total de productos: ${data.totalProducts}`,
        ...data.items.map((item) => `• ${item.name} (${item.category}) — ${item.stock} u. [${item.location}]`),
        `Actualizado: ${new Intl.DateTimeFormat("es-CL", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(data.updatedAt))}`,
      ],
    }),
  },
  stockLow: {
    endpoint: "/api/stock-bajo",
    method: "GET",
    format: (data) => ({
      title: "❗ Productos con stock bajo",
      lines: data.items.length
        ? data.items.map((item) => `• ${item.name} — ${item.stock} u. (mínimo ${item.minimum})`)
        : ["No hay productos críticos en este momento."],
    }),
  },
  movementsDay: {
    endpoint: "/api/movimientos-dia",
    method: "GET",
    format: (data) => ({
      title: "📅 Movimientos del día",
      lines: [
        `Ingresos registrados: ${data.resumen.ingresosRegistrados}`,
        ...data.ingresos.map((item) => `➕ ${item.producto} — ${item.cantidad} u. (${item.hora})`),
        `Salidas registradas: ${data.resumen.salidasRegistradas}`,
        ...data.salidas.map((item) => `➖ ${item.producto} — ${item.cantidad} u. (${item.hora})`),
      ],
    }),
  },
  movementsMonth: {
    endpoint: "/api/movimientos-mes",
    method: "GET",
    format: (data) => ({
      title: "📆 Movimientos del mes",
      lines: [
        `Total ingresos: ${data.ingresosTotales}`,
        `Total salidas: ${data.salidasTotales}`,
        "Productos destacados:",
        ...data.destacados.map((item) => `• ${item.producto} — ${item.movimientos} movimientos`),
      ],
    }),
  },
  criticalProducts: {
    endpoint: "/api/stock-bajo",
    method: "GET",
    format: (data) => ({
      title: "🚨 Productos críticos",
      lines: data.items.length
        ? data.items.map((item) => `• ${item.name} — ${item.stock} u. (mínimo ${item.minimum})`)
        : ["No se registran productos críticos."],
    }),
  },
  sendEmail: {
    endpoint: "/api/enviar-correo-stock-bajo",
    method: "POST",
    body: {
      message: "Alerta: existen productos con stock bajo en el inventario.",
    },
    format: (data) => ({
      title: "📧 Alerta enviada",
      lines: [data.message ?? "Correo enviado correctamente."],
    }),
  },
  sendWhatsapp: {
    endpoint: "/api/enviar-whatsapp-stock-bajo",
    method: "POST",
    body: {
      message: "⚠️ Alerta de inventario: hay productos con stock bajo.",
    },
    format: (data) => ({
      title: "📱 Alerta enviada",
      lines: [data.message ?? "Mensaje enviado correctamente."],
    }),
  },
  summaryDay: {
    endpoint: "/api/resumen-dia",
    method: "GET",
    onSuccess: (data, helpers) => {
      helpers.setSummaryCard(data);
      return {
        title: "📊 Resumen del día",
        lines: [
          `Total vendido hoy: ${helpers.currency(data.totalVendido)}`,
          `Productos vendidos: ${data.productosVendidos}`,
          `Ingresos registrados: ${data.ingresosRegistrados}`,
          `Salidas registradas: ${data.salidasRegistradas}`,
        ],
      };
    },
    stay: true,
  },
  summaryMonth: {
    endpoint: "/api/resumen-mes",
    method: "GET",
    onSuccess: (data, helpers) => ({
      title: "📅 Resumen del mes",
      lines: [
        `Mes: ${data.mes}`,
        `Total vendido: ${helpers.currency(data.totalVendido)}`,
        `Productos vendidos: ${data.productosVendidos}`,
        `Ingresos registrados: ${data.ingresosRegistrados}`,
        `Salidas registradas: ${data.salidasRegistradas}`,
      ],
    }),
    stay: true,
  },
};

function generateId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStack, setMenuStack] = useState(["main"]);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      title: "👋 Hola",
      lines: ["Selecciona una opción para comenzar."],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [summaryCard, setSummaryCard] = useState(null);

  const currentMenuKey = menuStack[menuStack.length - 1];
  const currentMenu = MENUS[currentMenuKey];

  useEffect(() => {
    if (currentMenuKey === "summary") {
      handleApiAction({ key: "summaryDay", stay: true });
    } else {
      setSummaryCard(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMenuKey]);

  const themes = {
    panel: darkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900",
    surface: darkMode ? "bg-slate-800 text-slate-100" : "bg-slate-50 text-slate-700",
    button: darkMode
      ? "bg-slate-800 hover:bg-slate-700 text-slate-100"
      : "bg-slate-100 hover:bg-slate-200 text-slate-900",
    backButton: darkMode
      ? "bg-slate-700 hover:bg-slate-600 text-slate-100"
      : "bg-slate-200 hover:bg-slate-300 text-slate-900",
  };

  const pushMessage = (message) => {
    setMessages((prev) => {
      const next = [...prev, { id: generateId(), ...message }];
      return next.slice(-8);
    });
  };

  const currency = (value) => {
    try {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        minimumFractionDigits: 0,
      }).format(value ?? 0);
    } catch (error) {
      return `$${value ?? 0}`;
    }
  };

  const handleApiAction = async ({ key, stay }) => {
    const config = API_ACTIONS[key];
    if (!config) return;

    setLoading(true);
    try {
      const response = await fetch(config.endpoint, {
        method: config.method ?? "GET",
        headers:
          (config.method ?? "GET") === "POST"
            ? { "Content-Type": "application/json" }
            : undefined,
        body:
          (config.method ?? "GET") === "POST" && config.body
            ? JSON.stringify(config.body)
            : undefined,
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Request failed");

      const data = await response.json();
      const helpers = { setSummaryCard, currency };
      const message = config.onSuccess
        ? config.onSuccess(data, helpers)
        : config.format
        ? config.format(data, helpers)
        : null;

      if (message) {
        pushMessage(message);
      }
    } catch (error) {
      pushMessage({
        title: "⚠️ Error",
        lines: ["No fue posible completar la acción. Intenta nuevamente."],
      });
    } finally {
      setLoading(false);
      const shouldStay = stay ?? config.stay ?? false;
      if (!shouldStay) {
        setMenuStack(["main"]);
      }
    }
  };

  const handleOption = (option) => {
    const { action } = option;
    if (!action) return;

    if (action.type === "menu") {
      setMenuStack((prev) => [...prev, action.target]);
      return;
    }

    if (action.type === "back") {
      setMenuStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : ["main"]));
      return;
    }

    if (action.type === "toggleTheme") {
      setDarkMode((prev) => !prev);
      pushMessage({
        title: "🌙 Preferencias",
        lines: [`Modo ${!darkMode ? "oscuro" : "claro"} activado en el asistente.`],
      });
      setMenuStack(["main"]);
      return;
    }

    if (action.type === "info") {
      pushMessage({
        title: action.title ?? currentMenu.title,
        lines: action.lines ?? [],
      });
      setMenuStack(["main"]);
      return;
    }

    if (action.type === "api") {
      handleApiAction(action);
    }
  };

  const renderedMessages = useMemo(
    () =>
      messages.map((message) => (
        <div
          key={message.id}
          className={`${themes.surface} rounded-xl border border-black/5 p-3 shadow-sm`}
        >
          <p className="text-sm font-semibold">{message.title}</p>
          <ul className="mt-1 space-y-1 text-xs leading-relaxed">
            {message.lines?.map((line, index) => (
              <li key={`${message.id}-${index}`}>{line}</li>
            ))}
          </ul>
        </div>
      )),
    [messages, themes.surface]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[1200]">
      <div className="flex h-full w-full items-end justify-end p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {isOpen && (
            <div
              className={`${themes.panel} w-full max-w-sm sm:max-w-md rounded-3xl border border-black/5 shadow-2xl transition-transform`}
              style={{ maxHeight: "min(540px, 80vh)" }}
            >
              <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Centro de Control</p>
                  <p className="text-xs opacity-60">Flujo guiado sin texto libre</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-black/10"
                  aria-label="Cerrar asistente"
                >
                  ×
                </button>
              </div>

              <div className="flex max-h-[calc(80vh-5rem)] flex-col gap-3 overflow-y-auto px-4 py-4">
                <div className="rounded-2xl border border-black/5 p-3 text-sm">
                  <p className="font-semibold">{currentMenu.title}</p>
                  <p className="text-xs opacity-70">{currentMenu.subtitle}</p>
                </div>

                {summaryCard && (
                  <div className={`${themes.surface} rounded-2xl border border-black/5 p-4`}>
                    <p className="text-sm font-semibold">📊 Resumen del Día</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>Total vendido hoy: {currency(summaryCard.totalVendido)}</li>
                      <li>Productos vendidos: {summaryCard.productosVendidos}</li>
                      <li>Ingresos registrados: {summaryCard.ingresosRegistrados}</li>
                      <li>Salidas registradas: {summaryCard.salidasRegistradas}</li>
                    </ul>
                  </div>
                )}

                <div className={`${themes.surface} rounded-2xl border border-black/5 p-3 space-y-2 max-h-40 overflow-y-auto`}>
                  {renderedMessages}
                  {loading && (
                    <div className="flex items-center gap-2 text-xs opacity-70">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                      Procesando solicitud...
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pb-2">
                  {currentMenu.options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleOption(option)}
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        option.action.type === "back" ? themes.backButton : themes.button
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}

                  {currentMenuKey !== "main" && (
                    <button
                      type="button"
                      onClick={() => setMenuStack(["main"])}
                      className={`${themes.backButton} rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition`}
                    >
                      🏠 Menú General
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-3xl text-white shadow-2xl transition hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300"
            aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente"}
          >
            {isOpen ? "–" : "🤖"}
          </button>
        </div>
      </div>
    </div>
  );
}
