"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Trash2 } from "lucide-react";

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [currentMenu, setCurrentMenu] = useState("main");
  const [conversationState, setConversationState] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // util: add message
  const addMessage = (text, isBot = true, options = null) => {
    setMessages((prev) => [
      ...prev,
      { text, isBot, options, timestamp: new Date().toISOString() },
    ]);
  };

  // scroll
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) showMainMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---------- MENUS ----------
  const showMainMenu = () => {
    setCurrentMenu("main");
    setConversationState({});
    addMessage(
      "¡Hola! 👋 ¿Qué necesitas?",
      true,
      [
        { id: "inventario", label: "📦 Inventario" },
        { id: "resumen", label: "📊 Resumen del Día" },
        { id: "borrar-chat", label: "🗑️ Borrar chat" },
      ]
    );
  };

  const showInventoryMenu = () => {
    setCurrentMenu("inventario");
    addMessage(
      "📦 Inventario - selecciona una opción:",
      true,
      [
        { id: "inventario-completo", label: "📋 Ver inventario" },
        { id: "buscar-producto", label: "🔍 Buscar producto" },
        { id: "stock-critico-redirect", label: "🚨 Mensaje a taller stock-critico" },
        { id: "volver-main", label: "⬅️ Volver" },
      ]
    );
  };

  const showResumenFechaMenu = (nextAction = null) => {
    setCurrentMenu("resumen-fecha");
    setConversationState((s) => ({ ...s, nextAction }));
    addMessage(
      "📅 ¿Para qué fecha quieres el resumen?",
      true,
      [
        { id: "hoy", label: "📅 Hoy" },
        { id: "otra-fecha", label: "📆 Otro día" },
        { id: "volver-main", label: "⬅️ Volver" },
      ]
    );
  };

  const showResumenOpciones = () => {
    setCurrentMenu("resumen-opciones");
    addMessage(
      "📊 Resumen - elige qué ver:",
      true,
      [
        { id: "ingreso-caja", label: "💵 Dinero ingresado en caja" },
        { id: "dinero-retirado", label: "💸 Dinero retirado" },
        { id: "ventas-totales", label: "🧾 Ventas totales" },
        { id: "volver-main", label: "⬅️ Volver" },
      ]
    );
  };

  // ---------- HELPERS ----------
  const parseDateInputDDMMYYYY = (str) => {
    // acepta DD-MM-YYYY o DD/MM/YYYY
    const cleaned = str.trim().replace(/\//g, "-");
    const parts = cleaned.split("-");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return null;
    // basic numeric checks
    const d = Number(dd), m = Number(mm), y = Number(yyyy);
    if (!d || !m || !y) return null;
    // build iso
    return `${yyyy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const todayISO = () => new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // ---------- INVENTORY HANDLERS ----------
  const handleInventarioCompleto = () => {
    addMessage("🔗 Abriendo inventario...", true);
    // redirigir al inventario
    setTimeout(() => (window.location.href = "/inventario"), 800);
  };

  const handleBuscarProducto = () => {
    setConversationState({ waitingFor: "product-name" });
    addMessage("🔍 Escribe el nombre del producto que quieres buscar:");
  };

  const searchProduct = async (productName) => {
    setIsLoading(true);
    try {
      addMessage(`🔎 Buscando "${productName}"...`);
      const res = await fetch(
        `/api/productos/buscar?nombre=${encodeURIComponent(
          productName
        )}&tienda_id=1`
      );
      const data = await res.json();
      if (data.error) {
        addMessage("❌ Error al buscar producto: " + (data.error || ""));
        return;
      }
      if (!data.productos || data.productos.length === 0) {
        addMessage(`❌ No encontré productos con el nombre "${productName}".`);
        return;
      }
      let msg = `🔍 Encontré ${data.productos.length} producto(s) para "${data.busqueda || productName}":\n\n`;
      data.productos.forEach((p, i) => {
        const stockTotal = p.stock_total ?? 0;
        const estado = stockTotal === 0 ? "🔴" : stockTotal <= 5 ? "🟡" : "🟢";
        msg += `${i + 1}. ${p.nombre} — ${estado} Stock: ${stockTotal}u\n`;
        if (p.todas_las_tallas && p.todas_las_tallas.length) {
          const tallasInfo = p.todas_las_tallas
            .map((t) => `${t.talla}:${t.stock}`)
            .join(" | ");
          msg += `   Tallas: ${tallasInfo}\n`;
        }
        msg += "\n";
      });
      addMessage(msg);
    } catch (err) {
      console.error(err);
      addMessage("❌ Hubo un error buscando el producto.");
    } finally {
      setIsLoading(false);
      setConversationState({});
      setTimeout(() => showInventoryMenu(), 1200);
    }
  };

  const handleEnviarCorreoTaller = async () => {
    setIsLoading(true);
    addMessage("✉️ Enviando correo al taller...");
    try {
      const res = await fetch("/api/enviar-correo-taller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tienda_id: 1 }),
      });
      const data = await res.json();
      if (data?.success) {
        addMessage("✅ Correo enviado al taller correctamente.");
      } else {
        addMessage("❌ No se pudo enviar el correo al taller.");
      }
    } catch (err) {
      console.error(err);
      addMessage("❌ Error enviando correo al taller.");
    } finally {
      setIsLoading(false);
      setTimeout(() => showInventoryMenu(), 1200);
    }
  };

  const handleStockCriticoRedirect = () => {
    addMessage("🔗 Te llevo a la página de stock crítico...", true);
    setTimeout(() => (window.location.href = "/stock-critico"), 700);
  };

  // ---------- RESUMEN / CAJA / VENTAS ----------
  // Mostrar resumen caja (ingresos manuales + ventas en efectivo)
  const handleIngresoCajaConFecha = async () => {
    const fecha = conversationState.fecha || todayISO();
    setIsLoading(true);
    addMessage(`🔄 Consultando ingreso en caja para ${fecha}...`);
    try {
      const res = await fetch(`/api/resumen-caja?fecha=${fecha}`);
      const data = await res.json();
      if (data.error) {
        addMessage("❌ Error al obtener resumen de caja.");
        return;
      }
      const esHoy = fecha === todayISO();
      const diaTexto = esHoy ? "hoy" : `el ${fecha}`;
      let msg = `💵 Ingreso en caja ${diaTexto}:\n\n`;
      msg += `💰 Total efectivo: $${(data.total_efectivo ?? 0).toLocaleString("es-CL")}\n\n`;
      msg += `🛒 Ventas en efectivo: $${(data.total_ventas_efectivo ?? 0).toLocaleString(
        "es-CL"
      )} (${data.cantidad_ventas_efectivo ?? 0} ventas)\n`;
      msg += `📝 Ingresos manuales: $${(data.total_ingresos_manuales ?? 0).toLocaleString(
        "es-CL"
      )} (${data.cantidad_ingresos_manuales ?? 0})\n`;
      if (data.cantidad_ingresos_manuales > 0 && data.detalle_manuales) {
        msg += `\n📋 Detalle ingresos manuales:\n`;
        data.detalle_manuales.forEach((ing) => {
          msg += `• $${(ing.monto ?? 0).toLocaleString("es-CL")} - ${ing.concepto} (${ing.hora})\n`;
        });
      }
      addMessage(msg);
    } catch (err) {
      console.error(err);
      addMessage("❌ No pude obtener el ingreso en caja.");
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenOpciones(), 1200);
    }
  };

  const handleDineroRetiradoConFecha = async () => {
    const fecha = conversationState.fecha || todayISO();
    setIsLoading(true);
    addMessage(`🔄 Consultando retiros para ${fecha}...`);
    try {
      const res = await fetch(`/api/dinero-retirado?fecha=${fecha}`);
      const data = await res.json();
      if (data.error) {
        addMessage("❌ Error al obtener retiros.");
        return;
      }
      const esHoy = fecha === todayISO();
      const diaTexto = esHoy ? "hoy" : `el ${fecha}`;
      let msg = `💸 Retiros de caja ${diaTexto}:\n\n`;
      if ((data.total_dia ?? 0) > 0) {
        msg += `📅 Retiros ${diaTexto}: $${(data.total_dia ?? 0).toLocaleString("es-CL")}\n`;
        if (data.total_acumulado_anterior > 0) {
          msg += `📊 Acumulado anterior: $${data.total_acumulado_anterior.toLocaleString("es-CL")}\n`;
        }
        msg += `\n📝 Detalle:\n`;
        (data.retiros_dia || []).forEach((r, i) => {
          msg += `${i + 1}. $${(r.monto ?? 0).toLocaleString("es-CL")} - ${r.motivo} \n`;
        });
      } else {
        msg += `✅ No hay retiros ${diaTexto}.\n`;
        if (data.total_acumulado_anterior > 0) {
          msg += `📊 Total acumulado: $${data.total_acumulado_anterior.toLocaleString("es-CL")}\n`;
        }
      }
      addMessage(msg);
    } catch (err) {
      console.error(err);
      addMessage("❌ No pude obtener los retiros.");
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenOpciones(), 1200);
    }
  };

  // Ventas totales 
  const handleVentasTotalesConFecha = async () => {
    const fecha = conversationState.fecha || todayISO();
    setIsLoading(true);
    addMessage(`🔄 Consultando ventas totales para ${fecha}...`);
    try {

      // Total vendido + número transacciones
      
      const res1 = await fetch(`/api/pos-total-dia?fecha=${fecha}`);
      const dataTot = await res1.json();

      if (dataTot && !dataTot.error) {

        const totalMoney = dataTot.total ?? 0;
        const cantidadTransacciones = dataTot.cantidad_ventas ?? dataTot.cantidad ?? 0;

        let msg = `🧾 Ventas totales (${fecha}):\n\n`;
        msg += `💰 Total vendido: $${Number(totalMoney).toLocaleString("es-CL")}\n`;
        

        // opcional: si endpoint devuelve desglose por categoría, mostrarlo (tal como pediste opcional)
        if (dataTot.categorias && dataTot.categorias.length > 0) {
          msg += `\n📋 Desglose por categorías:\n`;
          dataTot.categorias.forEach((c, i) => {
            msg += `${i + 1}. ${c.nombre_formateado || c.nombre}: ${c.cantidad} unidades\n`;
          });
        }

        addMessage(msg);
      } else {
        addMessage("❌ No hay ventas registradas para esa fecha.");
      }
    } catch (err) {
      console.error(err);
      addMessage("❌ No pude obtener las ventas totales.");
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenOpciones(), 1200);
    }
  };

  // ---------- OPTION CLICK ----------
  const handleOptionClick = (optionId) => {
    // Main
    if (optionId === "inventario") return showInventoryMenu();
    if (optionId === "resumen") return showResumenFechaMenu();
    if (optionId === "borrar-chat") return handleBorrarChat();
    if (optionId === "volver-main") return showMainMenu();

    // Inventario
    if (optionId === "inventario-completo") return handleInventarioCompleto();
    if (optionId === "buscar-producto") return handleBuscarProducto();
    
    if (optionId === "stock-critico-redirect") return handleStockCriticoRedirect();

    // Resumen fecha choices
    if (optionId === "hoy") {
      // set fecha a hoy y abrir submenú
      setConversationState((s) => ({ ...s, fecha: todayISO() }));
      addMessage(`📅 Mostrando resumen para hoy (${todayISO()})`);
      setTimeout(() => showResumenOpciones(), 700);
      return;
    }
    if (optionId === "otra-fecha") {
      setConversationState((s) => ({ ...s, waitingFor: "fecha-input" }));
      addMessage("📆 Escribe la fecha en formato DD-MM-YYYY (ej: 15-01-2024):");
      return;
    }

    // Resumen sub-options
    if (optionId === "ingreso-caja") {
      // si no hay fecha seleccionada, pedir fecha primero
      if (!conversationState.fecha) {
        return showResumenFechaMenu("ingreso-caja");
      }
      return handleIngresoCajaConFecha();
    }
    if (optionId === "dinero-retirado") {
      if (!conversationState.fecha) {
        return showResumenFechaMenu("dinero-retirado");
      }
      return handleDineroRetiradoConFecha();
    }
    if (optionId === "ventas-totales") {
      if (!conversationState.fecha) {
        return showResumenFechaMenu("ventas-totales");
      }
      return handleVentasTotalesConFecha();
    }

    // fallback
    addMessage("❓ Opción no reconocida. Vuelve al menú.", true);
    setTimeout(() => showMainMenu(), 800);
  };

  // ---------- SEND MESSAGE (user text input) ----------
  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;
    const userMessage = inputValue.trim();
    addMessage(userMessage, false);
    setInputValue("");

    // routing by waitingFor
    const waiting = conversationState.waitingFor;
    if (waiting === "product-name") {
      // buscar producto
      searchProduct(userMessage);
      return;
    }
    if (waiting === "stock-critico-number") {
      // search stock critico (but we redirect per request) - keep for compatibility
      searchStockCritico(userMessage);
      return;
    }
    if (waiting === "fecha-input") {
      const iso = parseDateInputDDMMYYYY(userMessage);
      if (!iso) {
        addMessage("❌ Formato inválido. Usa DD-MM-YYYY (ej: 15-01-2024). Intenta de nuevo.");
        return;
      }
      // save fecha
      setConversationState((s) => ({ ...s, fecha: iso, waitingFor: null }));
      addMessage(`📅 Fecha seteada: ${iso}`);
      // check nextAction
      const nextAction = conversationState.nextAction;
      setTimeout(() => {
        if (nextAction === "ingreso-caja") return handleIngresoCajaConFecha();
        if (nextAction === "dinero-retirado") return handleDineroRetiradoConFecha();
        if (nextAction === "ventas-totales") return handleVentasTotalesConFecha();
        // otherwise show resumen opciones
        return showResumenOpciones();
      }, 700);
      return;
    }

    // default
    addMessage("Selecciona una opción del menú o escribe una acción clara.", true);
  };

  // small helper: stock critico search fallback (but we redirect per your request)
  const searchStockCritico = async (numStr) => {
    const n = parseInt(numStr);
    if (isNaN(n)) {
      addMessage("❌ Escribe un número válido.");
      return;
    }
    setIsLoading(true);
    addMessage(`🚨 Buscando productos con stock ≤ ${n}...`);
    try {
      const res = await fetch(`/api/stock-bajo?tienda_id=1&stock_critico=${n}`);
      const data = await res.json();
      if (data.error) {
        addMessage("❌ Error consultando stock crítico.");
        return;
      }
      if (!data.productos || data.productos.length === 0) {
        addMessage(`✅ No hay productos con ${n} o menos unidades.`);
      } else {
        let msg = `🚨 Encontré ${data.productos.length} productos con stock ≤ ${n}:\n\n`;
        data.productos.forEach((p, i) => {
          msg += `${i + 1}. ${p.nombre} — ${p.stock_total ?? 0}u\n`;
          if (p.variantes_bajo && p.variantes_bajo.length) {
            p.variantes_bajo.forEach((v) => {
              msg += `   • ${v.talla}: ${v.stock_actual}u\n`;
            });
          }
          msg += "\n";
        });
        addMessage(msg);
      }
    } catch (err) {
      console.error(err);
      addMessage("❌ Error consultando stock crítico.");
    } finally {
      setIsLoading(false);
      setConversationState({});
      setTimeout(() => showInventoryMenu(), 1400);
    }
  };

  // borrar chat
  const handleBorrarChat = () => {
    setMessages([]);
    setInputValue("");
    setConversationState({});
    setCurrentMenu("main");
    setIsLoading(false);
    setTimeout(() => {
      addMessage("✨ Chat borrado. Empecemos de nuevo.", true);
      setTimeout(() => showMainMenu(), 800);
    }, 200);
  };

  // keyboard enter
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ---------- JSX ----------
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <div className="group relative">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
            aria-label="Abrir chatbot"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              ¿Necesitas ayuda?
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="bg-white rounded-lg shadow-2xl w-96 h-[600px] flex flex-col overflow-hidden">
          <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={24} />
              <div>
                <h3 className="font-semibold">Asistente POS</h3>
                <p className="text-xs text-indigo-100">Inventario y resumen diario</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-indigo-700 rounded-full p-1 transition-colors"
              aria-label="Cerrar chatbot"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.isBot ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${m.isBot ? "bg-white text-gray-800 shadow-md" : "bg-indigo-600 text-white"}`}>
                  <p className="whitespace-pre-line text-sm">{m.text}</p>
                  {m.options && (
                    <div className="mt-3 space-y-2">
                      {m.options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleOptionClick(opt.id)}
                          className="w-full text-left px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors text-sm font-medium"
                          disabled={isLoading}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg p-3 shadow-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe aquí..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleBorrarChat}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label="Borrar chat"
                title="Borrar todo el historial del chat"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label="Enviar mensaje"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
