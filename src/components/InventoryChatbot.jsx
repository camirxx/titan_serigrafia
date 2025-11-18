"use client";

import { useEffect, useMemo, useState } from "react";

const MENU_CONFIG = {
  main: {
    title: "🤖 Centro de Control de Inventario",
    description: "Selecciona una categoría:",
    options: [
      { label: "📦 Inventario", action: "menu", target: "inventory" },
      { label: "🔄 Movimientos", action: "menu", target: "movements" },
      { label: "🚨 Alertas y Notificaciones", action: "menu", target: "alerts" },
      { label: "📊 Resumen del Día", action: "menu", target: "summary" },
      { label: "🛠 Configuración", action: "menu", target: "settings" },
      { label: "❓ Ayuda", action: "menu", target: "help" },
    ],
  },
  inventory: {
    title: "📦 Inventario",
    description: "Selecciona una acción:",
    options: [
      { label: "📋 Ver inventario completo", action: "api", key: "stockTotal" },
      { label: "🔍 Buscar producto", action: "info", infoTitle: "🔍 Buscar producto", lines: [
        "Selecciona un producto predefinido:",
        "• Tinta UV Azul — Código: TUV-1023",
        "• Polera Premium Negra — Código: POL-NG-210",
        "• Transfer Textil Blanco — Código: TRF-BL-441",
        "Utiliza el menú de categorías para explorar más opciones."
      ] },
      { label: "🏷️ Ver por categoría", action: "info", infoTitle: "🏷️ Categorías disponibles", lines: [
        "• Tintas y Químicos",
        "• Textiles y Prendas",
        "• Insumos de Transferencia",
        "• Promocionales",
        "Selecciona una categoría para ver productos destacados en el inventario completo."
      ] },
      { label: "❗ Ver stock bajo", action: "api", key: "stockLow" },
      { label: "⬅️ Volver", action: "back" },
    ],
  },
  movements: {
    title: "🔄 Movimientos",
    description: "Elige una acción:",
    options: [
      { label: "➕ Registrar ingreso", action: "info", infoTitle: "➕ Registrar ingreso", lines: [
        "Registra ingresos desde el módulo de POS o desde la sección Inventario.",
        "Selecciona el producto, cantidad y origen del ingreso.",
        "El sistema actualizará el stock automáticamente."
      ] },
      { label: "➖ Registrar salida", action: "info", infoTitle: "➖ Registrar salida", lines: [
        "Registra salidas cuando prepares pedidos o transferencias.",
        "Confirma cantidades y destino antes de finalizar.",
        "Los ajustes quedan registrados en el historial del día."
      ] },
      { label: "📅 Movimientos del día", action: "api", key: "movementsDay" },
      { label: "📆 Movimientos del mes", action: "api", key: "movementsMonth" },
      { label: "⬅️ Volver", action: "back" },
    ],
  },
  alerts: {
    title: "🚨 Alertas y Notificaciones",
    description: "Gestiona las alertas de stock:",
    options: [
      { label: "🚨 Ver productos críticos", action: "api", key: "criticalProducts" },
      { label: "⚠️ Enviar alerta de stock bajo", action: "menu", target: "alertsSend" },
      { label: "🛎️ Configurar umbral de alerta", action: "info", infoTitle: "🛎️ Umbral de alerta", lines: [
        "Los productos se marcarán como críticos cuando el stock esté bajo el umbral configurado.",
        "Para modificar el umbral, ingresa a Configuración > Inventario en el panel principal.",
        "Puedes definir umbrales distintos por categoría."
      ] },
      { label: "⬅️ Volver", action: "back" },
    ],
  },
  alertsSend: {
    title: "⚠️ Enviar alerta de stock bajo",
    description: "Selecciona el canal:",
    options: [
      { label: "📧 Enviar a correo", action: "api", key: "sendEmail", stayOnMenu: false },
      { label: "📱 Enviar a WhatsApp", action: "api", key: "sendWhatsapp", stayOnMenu: false },
      { label: "⬅️ Volver", action: "back" },
    ],
  },
  summary: {
    title: "📊 Resumen del Día",
    description: "Información del día en tiempo real:",
    options: [
      { label: "📅 Ver resumen del mes", action: "api", key: "summaryMonth", stayOnMenu: true },
      { label: "⬅️ Volver", action: "back" },
    ],
  },
  settings: {
    title: "🛠 Configuración",
    description: "Acciones rápidas:",
    options: [
      { label: "🌙 Modo oscuro/claro", action: "toggleTheme" },
      { label: "📱 Cambiar número de WhatsApp", action: "info", infoTitle: "📱 Cambiar número", lines: [
        "Para actualizar el número de WhatsApp, ve a Configuración > Notificaciones.",
        "Selecciona el número autorizado y guarda los cambios.",
        "Las alertas se enviarán automáticamente al nuevo número."
      ] },
      { label: "📧 Cambiar correo del taller", action: "info", infoTitle: "📧 Cambiar correo", lines: [
        "Dirígete a Configuración > Contacto.",
        "Ingresa el nuevo correo y confirma con tu clave de administrador.",
        "El sistema enviará un correo de verificación al nuevo destinatario."
      ] },
      { label: "⬅️ Volver", action: "back" },
    ],
  },
  help: {
    title: "❓ Ayuda",
    description: "Preguntas frecuentes:",
    options: [
      { label: "¿Cómo registrar entrada?", action: "info", infoTitle: "¿Cómo registrar entrada?", lines: [
        "1. Ve a Inventario > Registrar ingreso.",
        "2. Selecciona el producto y la cantidad recibida.",
        "3. Confirma el origen y guarda.",
        "El stock se actualizará al instante."
      ] },
      { label: "¿Cómo ver stock bajo?", action: "info", infoTitle: "¿Cómo ver stock bajo?", lines: [
        "Selecciona Inventario > Ver stock bajo.",
        "También puedes recibir alertas automáticas en correo o WhatsApp.",
        "Mantén actualizado el umbral de alerta en Configuración."
      ] },
      { label: "¿Cómo enviar alerta?", action: "info", infoTitle: "¿Cómo enviar alerta?", lines: [
        "1. Ve a Alertas y Notificaciones.",
        "2. Selecciona Enviar alerta de stock bajo.",
        "3. Elige correo o WhatsApp y confirma el envío.",
        "Los mensajes se generan con información predefinida."
      ] },
      { label: "¿Cómo buscar un producto?", action: "info", infoTitle: "¿Cómo buscar un producto?", lines: [
        "Utiliza Inventario > Buscar producto.",
        "Selecciona la categoría y luego el producto que necesitas.",
        "Puedes ver su stock actual y ubicación en bodega."
      ] },
      { label: "⬅️ Volver", action: "back" },
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
        ...data.ingresos.map((mov) => `➕ ${mov.producto} — ${mov.cantidad} u. (${mov.hora})`),
        `Salidas registradas: ${data.resumen.salidasRegistradas}`,
        ...data.salidas.map((mov) => `➖ ${mov.producto} — ${mov.cantidad} u. (${mov.hora})`),
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
        `Productos con más rotación:`,
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
      title: "📧 Alerta por correo",
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
      title: "📱 Alerta por WhatsApp",
      lines: [data.message ?? "Mensaje enviado correctamente."],
    }),
  },
  summaryDay: {
    endpoint: "/api/resumen-dia",
    method: "GET",
    stayOnMenu: true,
    onSuccess: (data, helpers) => {
      helpers.setSummaryCard(data);
      return {
        title: "📊 Resumen del Día",
        lines: [
          `Total vendido hoy: ${helpers.formatCurrency(data.totalVendido)}`,
          `Productos vendidos: ${data.productosVendidos}`,
          `Ingresos registrados: ${data.ingresosRegistrados}`,
          `Salidas registradas: ${data.salidasRegistradas}`,
        ],
      };
    },
  },
  summaryMonth: {
    endpoint: "/api/resumen-mes",
    method: "GET",
    stayOnMenu: true,
    format: (data, helpers) => ({
      title: "📅 Resumen del mes",
      lines: [
        `Mes: ${data.mes}`,
        `Total vendido: ${helpers.formatCurrency(data.totalVendido)}`,
        `Productos vendidos: ${data.productosVendidos}`,
        `Ingresos registrados: ${data.ingresosRegistrados}`,
        `Salidas registradas: ${data.salidasRegistradas}`,
      ],
    }),
  },
};

export default function InventoryChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStack, setMenuStack] = useState(["main"]);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      title: "👋 Bienvenido",
      lines: ["Selecciona una categoría para comenzar."],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [summaryCard, setSummaryCard] = useState(null);

  const currentMenuKey = menuStack[menuStack.length - 1];
  const currentMenu = MENU_CONFIG[currentMenuKey];

  useEffect(() => {
    if (currentMenuKey !== "summary") {
      setSummaryCard(null);
    }
  }, [currentMenuKey]);

  useEffect(() => {
    if (currentMenuKey === "summary") {
      handleApiAction({ key: "summaryDay" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMenuKey]);

  const panelTheme = darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900";
  const messageTheme = darkMode ? "bg-gray-800 text-gray-100" : "bg-gray-50 text-gray-700";
  const buttonTheme = darkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-100" : "bg-gray-100 hover:bg-gray-200 text-gray-900";
  const backButtonTheme = darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-100" : "bg-gray-200 hover:bg-gray-300 text-gray-900";

  const pushMessage = (message) => {
    setMessages((prev) => {
      const id =
        typeof globalThis !== "undefined" &&
        globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === "function"
          ? globalThis.crypto.randomUUID()
          : String(Date.now());
      const next = [...prev, { id, ...message }];
      return next.slice(-6);
    });
  };

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        minimumFractionDigits: 0,
      }).format(value ?? 0);
    } catch (err) {
      return `$${value ?? 0}`;
    }
  };

  const handleApiAction = async ({ key, stayOnMenu }) => {
    const actionConfig = API_ACTIONS[key];
    if (!actionConfig) return;

    const shouldStay = stayOnMenu ?? actionConfig.stayOnMenu ?? false;

    setLoading(true);
    try {
      const response = await fetch(actionConfig.endpoint, {
        method: actionConfig.method ?? "GET",
        headers:
          actionConfig.method === "POST"
            ? {
                "Content-Type": "application/json",
              }
            : undefined,
        body: actionConfig.method === "POST" ? JSON.stringify(actionConfig.body ?? {}) : undefined,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Solicitud fallida");
      }

      const data = await response.json();
      const helpers = { setSummaryCard, formatCurrency };

      const message = actionConfig.onSuccess
        ? actionConfig.onSuccess(data, helpers)
        : actionConfig.format
        ? actionConfig.format(data, helpers)
        : null;

      if (message) {
        pushMessage(message);
      }
    } catch (error) {
      pushMessage({
        title: "⚠️ Error",
        lines: ["Ocurrió un problema al procesar la solicitud."],
      });
    } finally {
      setLoading(false);
      if (!shouldStay) {
        setMenuStack(["main"]);
      }
    }
  };

  const handleOption = (option) => {
    if (!option) return;

    if (option.action === "menu") {
      setMenuStack((prev) => [...prev, option.target]);
      return;
    }

    if (option.action === "back") {
      setMenuStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : ["main"]));
      return;
    }

    if (option.action === "toggleTheme") {
      setDarkMode((prev) => !prev);
      pushMessage({
        title: "🌙 Preferencias",
        lines: [
          `Modo ${!darkMode ? "oscuro" : "claro"} activado para el asistente.`,
          "El resto de la plataforma mantiene su configuración actual.",
        ],
      });
      setMenuStack(["main"]);
      return;
    }

    if (option.action === "info") {
      pushMessage({
        title: option.infoTitle ?? currentMenu.title,
        lines: option.lines ?? [],
      });
      setMenuStack(["main"]);
      return;
    }

    if (option.action === "api") {
      handleApiAction(option);
      return;
    }
  };

  const renderMessages = useMemo(
    () =>
      messages.map((message) => (
        <div key={message.id} className={`${messageTheme} rounded-lg border border-black/5 p-3 shadow-sm`}>
          <p className="font-semibold text-sm mb-1">{message.title}</p>
          <ul className="space-y-1 text-xs leading-relaxed">
            {message.lines?.map((line, idx) => (
              <li key={`${message.id}-line-${idx}`}>{line}</li>
            ))}
          </ul>
        </div>
      )),
    [messages, messageTheme]
  );

  return (
    <div className="fixed inset-0 z-[1200] pointer-events-none">
      <div className="flex h-full w-full items-end justify-end p-4 sm:p-6">
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          {isOpen && (
            <div
              className={`${panelTheme} w-80 sm:w-[28rem] max-h-[85vh] rounded-2xl shadow-2xl border border-black/5 flex flex-col overflow-hidden`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
                <div>
                  <p className="font-semibold text-sm">Asistente de Inventario</p>
                  <p className="text-xs opacity-70">Flujo guiado sin texto libre</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-lg hover:bg-black/10 transition"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
                <div className="rounded-xl border border-black/5 p-3 text-sm">
                  <p className="font-semibold mb-1">{currentMenu.title}</p>
                  <p className="text-xs opacity-80">{currentMenu.description}</p>
                </div>

                {summaryCard && (
                  <div className={`${messageTheme} rounded-xl border border-black/5 p-4`}>
                    <p className="font-semibold text-sm mb-2">📊 Resumen del Día</p>
                    <ul className="text-xs space-y-1">
                      <li>Total vendido hoy: {formatCurrency(summaryCard.totalVendido)}</li>
                      <li>Productos vendidos: {summaryCard.productosVendidos}</li>
                      <li>Ingresos registrados: {summaryCard.ingresosRegistrados}</li>
                      <li>Salidas registradas: {summaryCard.salidasRegistradas}</li>
                    </ul>
                  </div>
                )}

                <div className={`${messageTheme} rounded-xl border border-black/5 p-3 space-y-2 max-h-44 overflow-y-auto`}>
                  {renderMessages}
                  {loading && (
                    <div className="flex items-center gap-2 text-xs opacity-70">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
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
                      className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        option.action === "back" ? backButtonTheme : buttonTheme
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}

                  {currentMenuKey !== "main" && (
                    <button
                      type="button"
                      onClick={() => setMenuStack(["main"])}
                      className={`${backButtonTheme} rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition`}
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
            className="bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-xl h-14 w-14 flex items-center justify-center text-2xl transition"
            aria-label="Abrir asistente de inventario"
          >
            {isOpen ? "–" : "🤖"}
          </button>
        </div>
      </div>
    </div>
  );
}
