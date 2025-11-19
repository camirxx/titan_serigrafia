"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_MESSAGES = 24;

const formatCurrency = (value) => {
  if (typeof value !== "number") return "Sin datos";
  return value.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  });
};

const formatNumber = (value) => {
  if (typeof value !== "number") return "Sin datos";
  return value.toLocaleString("es-CL");
};

const formatStockBajo = (payload) => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];

  if (!items.length) {
    return {
      title: "✅ Stock bajo",
      lines: ["No hay productos críticos actualmente."],
    };
  }

  const lines = items.slice(0, 6).map((item) => {
    const nombre = item?.nombre ?? item?.name ?? "Producto";
    const sku = item?.sku ? `SKU ${item.sku}` : "sin SKU";
    const stock = item?.stock ?? item?.cantidad ?? 0;
    return `• ${nombre} (${sku}) → ${stock} unidades`;
  });

  if (items.length > 6) {
    lines.push(`… y ${items.length - 6} productos más en nivel crítico.`);
  }

  return {
    title: "🚨 Productos críticos",
    lines,
  };
};

const formatInventarioCompleto = (payload) => {
  const resumen = payload?.resumen ?? payload;
  const totalProductos = resumen?.totalProductos ?? resumen?.total_productos;
  const totalCategorias = resumen?.totalCategorias ?? resumen?.total_categorias;
  const totalStock = resumen?.stockTotal ?? resumen?.stock_total;

  return {
    title: "📦 Inventario General",
    lines: [
      `• Total de productos: ${formatNumber(totalProductos)}`,
      `• Categorías activas: ${formatNumber(totalCategorias)}`,
      `• Unidades en stock: ${formatNumber(totalStock)}`,
      "Para más detalle ingresa al módulo de Inventario.",
    ],
  };
};

const formatMovimientos = (payload, scope = "día") => {
  const movimientos = Array.isArray(payload?.movimientos)
    ? payload.movimientos
    : Array.isArray(payload)
      ? payload
      : [];

  if (!movimientos.length) {
    return {
      title: `📅 Movimientos del ${scope}`,
      lines: ["No se registran movimientos en el periodo seleccionado."],
    };
  }

  const lines = movimientos.slice(0, 5).map((movimiento) => {
    const tipo = movimiento?.tipo ?? movimiento?.movement_type ?? "Movimiento";
    const producto = movimiento?.producto ?? movimiento?.product ?? "Producto";
    const cantidad = movimiento?.cantidad ?? movimiento?.quantity ?? 0;
    return `• ${tipo}: ${producto} (${cantidad})`;
  });

  if (movimientos.length > 5) {
    lines.push(`… y ${movimientos.length - 5} movimientos adicionales.`);
  }

  return {
    title: `📅 Movimientos del ${scope}`,
    lines,
  };
};

const formatResumenDia = (payload) => {
  const resumen = payload?.resumen ?? payload ?? {};
  const totalVendido = resumen?.totalVendido ?? resumen?.total_vendido;
  const productosVendidos = resumen?.productosVendidos ?? resumen?.productos_vendidos;
  const ingresos = resumen?.ingresos ?? resumen?.ingresos_registrados;
  const salidas = resumen?.salidas ?? resumen?.salidas_registradas;

  return {
    title: "📊 Resumen del Día",
    lines: [
      `• Total vendido hoy: ${formatCurrency(totalVendido ?? 0)}`,
      `• Productos vendidos: ${formatNumber(productosVendidos ?? 0)}`,
      `• Ingresos registrados: ${formatNumber(ingresos ?? 0)}`,
      `• Salidas registradas: ${formatNumber(salidas ?? 0)}`,
    ],
  };
};

const formatResumenMes = (payload) => {
  const resumen = payload?.resumen ?? payload ?? {};
  const totalVendido = resumen?.totalVendido ?? resumen?.total_vendido;
  const productosVendidos = resumen?.productosVendidos ?? resumen?.productos_vendidos;
  const ingresos = resumen?.ingresos ?? resumen?.ingresos_registrados;
  const salidas = resumen?.salidas ?? resumen?.salidas_registradas;

  return {
    title: "📅 Resumen del Mes",
    lines: [
      `• Total vendido: ${formatCurrency(totalVendido ?? 0)}`,
      `• Productos vendidos: ${formatNumber(productosVendidos ?? 0)}`,
      `• Ingresos registrados: ${formatNumber(ingresos ?? 0)}`,
      `• Salidas registradas: ${formatNumber(salidas ?? 0)}`,
    ],
  };
};

const formatPostResult = (successTitle) => ({
  title: successTitle,
  lines: ["Se solicitó la acción correctamente. Revisa el estado en unos momentos."],
});

const MENU_STRUCTURE = {
  general: {
    title: "🤖 Centro de Control de Inventario",
    subtitle: "Selecciona una categoría:",
    options: [
      { id: "menu-inventario", label: "📦 Inventario", type: "submenu", next: "inventario" },
      { id: "menu-movimientos", label: "🔄 Movimientos", type: "submenu", next: "movimientos" },
      { id: "menu-alertas", label: "🚨 Alertas y Notificaciones", type: "submenu", next: "alertas" },
      { id: "menu-resumen", label: "📊 Resumen del Día", type: "submenu", next: "resumenDia" },
      { id: "menu-configuracion", label: "🛠 Configuración", type: "submenu", next: "configuracion" },
      { id: "menu-ayuda", label: "❓ Ayuda", type: "submenu", next: "ayuda" },
    ],
  },
  inventario: {
    title: "📦 Inventario",
    subtitle: "Elige una acción:",
    options: [
      {
        id: "inventario-completo",
        label: "📋 Ver inventario completo",
        type: "fetch",
        method: "GET",
        endpoint: "/api/stock-total",
        formatter: formatInventarioCompleto,
      },
      {
        id: "inventario-buscar",
        label: "🔍 Buscar producto",
        type: "info",
        response: {
          title: "🔍 Buscar producto",
          lines: [
            "Ingresa al módulo de Inventario y utiliza el buscador superior.",
            "Puedes buscar por SKU, nombre o categoría.",
            "Aplica filtros combinados para afinar resultados.",
          ],
        },
      },
      {
        id: "inventario-categoria",
        label: "🏷️ Ver por categoría",
        type: "info",
        response: {
          title: "🏷️ Ver por categoría",
          lines: [
            "Selecciona la pestaña 'Agrupar por categoría' en el módulo de Inventario.",
            "Ordena por ventas, stock o margen desde la cabecera de la tabla.",
          ],
        },
      },
      {
        id: "inventario-stock-bajo",
        label: "❗ Ver stock bajo",
        type: "fetch",
        method: "GET",
        endpoint: "/api/stock-bajo",
        formatter: formatStockBajo,
      },
      { id: "inventario-volver", label: "⬅️ Volver", type: "back" },
    ],
  },
  movimientos: {
    title: "🔄 Movimientos",
    subtitle: "Controla ingresos y salidas:",
    options: [
      {
        id: "movimientos-ingreso",
        label: "➕ Registrar ingreso",
        type: "info",
        response: {
          title: "➕ Registrar ingreso",
          lines: [
            "Abre Movimientos > Registrar ingreso.",
            "Selecciona el producto, cantidad y almacén.",
            "Guarda para actualizar el stock al instante.",
          ],
        },
      },
      {
        id: "movimientos-salida",
        label: "➖ Registrar salida",
        type: "info",
        response: {
          title: "➖ Registrar salida",
          lines: [
            "Ingresa a Movimientos > Registrar salida.",
            "Especifica motivo, producto y cantidad.",
            "Confirma para descontar inventario y dejar trazabilidad.",
          ],
        },
      },
      {
        id: "movimientos-dia",
        label: "📅 Movimientos del día",
        type: "fetch",
        method: "GET",
        endpoint: "/api/movimientos-dia",
        formatter: (data) => formatMovimientos(data, "día"),
      },
      {
        id: "movimientos-mes",
        label: "📆 Movimientos del mes",
        type: "fetch",
        method: "GET",
        endpoint: "/api/movimientos-mes",
        formatter: (data) => formatMovimientos(data, "mes"),
      },
      { id: "movimientos-volver", label: "⬅️ Volver", type: "back" },
    ],
  },
  alertas: {
    title: "🚨 Alertas y Notificaciones",
    subtitle: "Gestiona las alertas de stock:",
    options: [
      {
        id: "alertas-criticos",
        label: "🚨 Ver productos críticos",
        type: "fetch",
        method: "GET",
        endpoint: "/api/stock-bajo",
        formatter: formatStockBajo,
      },
      {
        id: "alertas-enviar",
        label: "⚠️ Enviar alerta de stock bajo",
        type: "submenu",
        next: "alertasEnvio",
      },
      {
        id: "alertas-umbral",
        label: "🛎️ Configurar umbral de alerta",
        type: "info",
        response: {
          title: "🛎️ Configurar umbral",
          lines: [
            "Entra a Configuración > Notificaciones.",
            "Define el stock mínimo por producto o categoría.",
            "Activa recordatorios automáticos por correo o WhatsApp.",
          ],
        },
      },
      { id: "alertas-volver", label: "⬅️ Volver", type: "back" },
    ],
  },
  alertasEnvio: {
    title: "⚠️ Enviar alerta de stock bajo",
    subtitle: "Selecciona el medio de envío:",
    options: [
      {
        id: "alertas-correo",
        label: "📧 Enviar a correo",
        type: "post",
        method: "POST",
        endpoint: "/api/enviar-correo-stock-bajo",
        formatter: () => formatPostResult("📧 Alerta enviada por correo"),
      },
      {
        id: "alertas-whatsapp",
        label: "📱 Enviar a WhatsApp",
        type: "post",
        method: "POST",
        endpoint: "/api/enviar-whatsapp-stock-bajo",
        formatter: () => formatPostResult("📱 Alerta enviada por WhatsApp"),
      },
      { id: "alertas-envio-volver", label: "⬅️ Volver", type: "back" },
    ],
  },
  resumenDia: {
    title: "📊 Resumen del Día",
    subtitle: "Revisa los indicadores principales:",
    autoFetch: {
      method: "GET",
      endpoint: "/api/resumen-dia",
      formatter: formatResumenDia,
    },
    options: [
      {
        id: "resumen-mes",
        label: "📅 Ver resumen del mes",
        type: "fetch",
        method: "GET",
        endpoint: "/api/resumen-mes",
        formatter: formatResumenMes,
      },
      { id: "resumen-volver", label: "⬅️ Volver", type: "back" },
    ],
  },
  configuracion: {
    title: "🛠 Configuración",
    subtitle: "Ajustes rápidos:",
    options: [
      {
        id: "configuracion-modo",
        label: "🌙 Modo oscuro/claro",
        type: "info",
        response: {
          title: "🌙 Modo oscuro/claro",
          lines: [
            "Ve a Configuración > Apariencia.",
            "Activa el modo que prefieras y guarda los cambios.",
            "El ajuste se aplica a toda la cuenta inmediatamente.",
          ],
        },
      },
      {
        id: "configuracion-whatsapp",
        label: "📱 Cambiar número de WhatsApp",
        type: "info",
        response: {
          title: "📱 Cambiar número de WhatsApp",
          lines: [
            "En Configuración > Notificaciones agrega el nuevo número.",
            "Verifica el código enviado para habilitar alertas.",
          ],
        },
      },
      {
        id: "configuracion-correo",
        label: "📧 Cambiar correo del taller",
        type: "info",
        response: {
          title: "📧 Cambiar correo",
          lines: [
            "En Configuración > Contacto actualiza el correo principal.",
            "Confirma desde la bandeja de entrada para activar la nueva dirección.",
          ],
        },
      },
      { id: "configuracion-volver", label: "⬅️ Volver", type: "back" },
    ],
  },
  ayuda: {
    title: "❓ Ayuda",
    subtitle: "Preguntas frecuentes:",
    options: [
      {
        id: "ayuda-entrada",
        label: "¿Cómo registrar entrada?",
        type: "info",
        response: {
          title: "¿Cómo registrar entrada?",
          lines: [
            "Ingresa a Movimientos > Registrar ingreso.",
            "Completa producto, cantidad y almacén.",
            "Guarda para sumar stock y generar comprobante.",
          ],
        },
      },
      {
        id: "ayuda-stock",
        label: "¿Cómo ver stock bajo?",
        type: "info",
        response: {
          title: "¿Cómo ver stock bajo?",
          lines: [
            "Desde Inventario selecciona la vista 'Stock bajo'.",
            "Activa alertas automáticas para recibir avisos diarios.",
          ],
        },
      },
      {
        id: "ayuda-alerta",
        label: "¿Cómo enviar alerta?",
        type: "info",
        response: {
          title: "¿Cómo enviar alerta?",
          lines: [
            "Dirígete a Alertas > Enviar alerta de stock bajo.",
            "Elige correo o WhatsApp y confirma.",
          ],
        },
      },
      {
        id: "ayuda-buscar",
        label: "¿Cómo buscar un producto?",
        type: "info",
        response: {
          title: "¿Cómo buscar un producto?",
          lines: [
            "Usa el buscador del módulo de Inventario.",
            "Aplica filtros por categoría, proveedor o etiquetas.",
          ],
        },
      },
      { id: "ayuda-volver", label: "⬅️ Volver", type: "back" },
    ],
  },
};

const parseOptionLabel = (label = "") => {
  const trimmed = label.trim();
  if (!trimmed) return { icon: null, text: "" };
  const parts = trimmed.split(" ");
  if (parts.length > 1 && parts[0].length <= 3) {
    return { icon: parts[0], text: parts.slice(1).join(" ") };
  }
  return { icon: null, text: trimmed };
};

const generateId = (prefix = "msg") => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "bot",
      title: "Hola 👋",
      lines: [
        "¡Bienvenido! ¿En qué puedo ayudarte hoy?",
        "Selecciona una de las opciones disponibles o escríbenos tu consulta.",
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [menuStack, setMenuStack] = useState(["general"]);
  const endOfMessagesRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastAnnouncedMenuRef = useRef(null);

  const currentMenuKey = menuStack[menuStack.length - 1];
  const currentMenu = MENU_STRUCTURE[currentMenuKey] ?? MENU_STRUCTURE.general;
  const availableOptions = currentMenu?.options ?? MENU_STRUCTURE.general.options;

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  const appendMessage = useCallback((message) => {
    setMessages((prev) => {
      const next = [...prev, { id: generateId(), ...message }];
      return next.slice(-MAX_MESSAGES);
    });
  }, []);

  const handleMenuAnnouncement = useCallback((menuKey) => {
    if (menuKey === "general") return;
    const menu = MENU_STRUCTURE[menuKey];
    if (!menu) return;

    const lines = [];
    if (menu.subtitle) {
      lines.push(menu.subtitle);
    }
    if (Array.isArray(menu.options) && menu.options.length > 0) {
      menu.options.forEach((option) => {
        if (option?.label) {
          lines.push(option.label);
        }
      });
    }

    appendMessage({
      role: "bot",
      title: menu.title,
      lines: lines.length ? lines : undefined,
    });
  }, [appendMessage]);

  const fetchAndDisplay = useCallback(async ({ method = "GET", endpoint, formatter, body }) => {
    if (!endpoint) return;
    setIsTyping(true);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener información en este momento.");
      }

      const data = await response.json();
      const formatted = formatter ? formatter(data) : { lines: ["Acción completada."] };

      appendMessage({
        role: "bot",
        ...formatted,
      });
    } catch (error) {
      appendMessage({
        role: "bot",
        title: "⚠️ Error",
        lines: [error?.message ?? "No se pudo completar la acción."],
      });
    } finally {
      setIsTyping(false);
    }
  }, [appendMessage]);

  useEffect(() => {
    if (!currentMenu) return;
    if (lastAnnouncedMenuRef.current !== currentMenuKey) {
      lastAnnouncedMenuRef.current = currentMenuKey;
      handleMenuAnnouncement(currentMenuKey);

      if (currentMenu.autoFetch) {
        fetchAndDisplay(currentMenu.autoFetch);
      }
    }
  }, [currentMenuKey, currentMenu, handleMenuAnnouncement, fetchAndDisplay]);

  const handleOptionSelect = (option) => {
    if (!option || isTyping) return;

    appendMessage({
      role: "user",
      lines: [option.label],
    });

    if (option.type === "submenu" && option.next) {
      lastAnnouncedMenuRef.current = null;
      setMenuStack((prev) => [...prev, option.next]);
      return;
    }

    if (option.type === "back") {
      if (menuStack.length > 1) {
        lastAnnouncedMenuRef.current = null;
        setMenuStack((prev) => prev.slice(0, -1));
      }
      return;
    }

    if (option.type === "info" && option.response) {
      appendMessage({
        role: "bot",
        ...option.response,
      });
      return;
    }

    if ((option.type === "fetch" || option.type === "post") && option.endpoint) {
      fetchAndDisplay({
        method: option.method ?? (option.type === "post" ? "POST" : "GET"),
        endpoint: option.endpoint,
        formatter: option.formatter,
        body: option.body,
      });
      return;
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    appendMessage({
      role: "user",
      lines: [trimmed],
    });
    setInputValue("");

    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      appendMessage({
        role: "bot",
        title: "Recibimos tu mensaje",
        lines: [
          "Un especialista revisará tu consulta y te responderá a la brevedad.",
          "Mientras tanto, puedes seguir navegando por las categorías rápidas.",
        ],
      });
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[99999] pointer-events-none">
        <div
          className={`absolute bottom-16 right-0 w-[90vw] max-h-[80vh] sm:w-[380px] transition-all duration-300 transform origin-bottom ${
            isOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0"
          }`}
        >
          <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-[24px] bg-white text-slate-900 shadow-[0_18px_40px_rgba(79,70,229,0.25)] ring-1 ring-black/5">
            <header className="flex items-center justify-between gap-3 rounded-t-[24px] bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-4 text-white shadow-inner">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-2xl">
                  🤖
                </span>
                <div>
                  <p className="text-sm font-semibold">TitanBot</p>
                  <p className="text-xs text-white/80">En línea • tiempo de respuesta rápido</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg transition hover:bg-white/25"
                aria-label="Cerrar chat"
              >
                ×
              </button>
            </header>

            <div className="flex flex-1 flex-col gap-4 bg-slate-50/70 px-4 pb-4 pt-5">
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300/80">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[78%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm transition ${
                        message.role === "user"
                          ? "bg-indigo-500 text-white"
                          : "bg-white text-slate-800 ring-1 ring-slate-100"
                      }`}
                    >
                      {message.title ? (
                        <p className="mb-1 text-sm font-semibold">{message.title}</p>
                      ) : null}
                      {message.lines?.map((line, idx) => (
                        <p key={`${message.id}-line-${idx}`} className="text-sm">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

                {isTyping ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200">
                      <span className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:120ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:240ms]" />
                      </span>
                      TitanBot está escribiendo…
                    </div>
                  </div>
                ) : null}

                <span ref={endOfMessagesRef} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Temas rápidos
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {availableOptions.map((option) => (
                    <button
                      key={option.id ?? option.label ?? option.next}
                      type="button"
                      onClick={() => handleOptionSelect(option)}
                      disabled={isTyping && option.type !== "back"}
                      className={`group flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                        isTyping && option.type !== "back"
                          ? "cursor-not-allowed opacity-60"
                          : "hover:-translate-y-[2px] hover:border-transparent hover:bg-gradient-to-r hover:from-indigo-500/90 hover:to-fuchsia-500/90 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {(() => {
                          const { icon, text } = parseOptionLabel(option.label ?? "");
                          return (
                            <>
                              {icon ? <span className="text-lg">{icon}</span> : null}
                              <span>{text}</span>
                            </>
                          );
                        })()}
                      </span>
                      <span className="text-base text-slate-300 transition group-hover:text-white">
                        ↗
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 rounded-[18px] bg-white p-2 shadow-inner ring-1 ring-slate-200"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Escribe aquí tu consulta"
                  className="h-10 flex-1 rounded-2xl border-none bg-transparent px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-[16px] bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-500/90 hover:to-fuchsia-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label="Enviar mensaje"
                >
                  ➤
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200"
        aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente"}
      >
        <span className="text-lg">🤖</span>
        {isOpen ? "Cerrar" : "Chat de Ayuda"}
      </button>
    </>
  );
}
