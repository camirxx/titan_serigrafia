"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [currentMenu, setCurrentMenu] = useState('main');
  const [conversationState, setConversationState] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      showMainMenu();
    }
  }, [isOpen]);

  const addMessage = (text, isBot = true, options = null) => {
    setMessages(prev => [...prev, { text, isBot, options, timestamp: new Date() }]);
  };

  const showMainMenu = () => {
    setCurrentMenu('main');
    setConversationState({});
    addMessage(
      '¡Hola! 👋 ¿Qué necesitas?',
      true,
      [
        { id: 'inventario', label: '📦 Inventario' },
        { id: 'resumen', label: '📊 Resumen del Día' }
      ]
    );
  };

  const showInventoryMenu = () => {
    setCurrentMenu('inventario');
    addMessage(
      '📦 ¿Qué quieres ver?',
      true,
      [
        { id: 'inventario-completo', label: '📋 Ver todo' },
        { id: 'buscar-producto', label: '🔍 Buscar producto' },
        { id: 'stock-bajo', label: '⚠️ Stock bajo' },
        { id: 'volver-main', label: '⬅️ Volver' }
      ]
    );
  };

  const showResumenMenu = () => {
    setCurrentMenu('resumen');
    addMessage(
      '📊 ¿Qué quieres consultar?',
      true,
      [
        { id: 'resumen-caja', label: '💰 Caja' },
        { id: 'resumen-productos', label: '🛒 Productos' },
        { id: 'volver-main', label: '⬅️ Volver' }
      ]
    );
  };

  const showResumenCajaMenu = () => {
    setCurrentMenu('resumen-caja');
    addMessage(
      '💰 Resumen de Caja:',
      true,
      [
        { id: 'ganancia-dia', label: '✨ Ganancia del día' },
        { id: 'ingreso-caja', label: '💵 Ingreso en caja' },
        { id: 'dinero-retirado', label: '💸 Retiro de caja' },
        { id: 'volver-resumen', label: '⬅️ Volver' }
      ]
    );
  };

  const showResumenProductosMenu = () => {
    setCurrentMenu('resumen-productos');
    addMessage(
      '🛒 Resumen de Productos:',
      true,
      [
        { id: 'total-vendido', label: '🧮 Total vendido del día' },
        { id: 'total-poleras', label: '👕 Total poleras vendidas' },
        { id: 'modelo-mas-vendido', label: '🏆 Modelo más vendido' },
        { id: 'volver-resumen', label: '⬅️ Volver' }
      ]
    );
  };

  const handleInventarioCompleto = () => {
    addMessage('Te llevo al inventario... 📋', true);
    setTimeout(() => {
      window.location.href = '/inventario';
    }, 1000);
  };

  const handleBuscarProducto = () => {
    setConversationState({ waitingFor: 'product-name' });
    addMessage('🔍 Escribe el nombre del producto:');
  };

  const searchProduct = async (productName) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/productos/buscar?nombre=${encodeURIComponent(productName)}`);
      const data = await response.json();

      if (data && data.nombre) {
        let estado = '🟢 Normal';
        if (data.stock <= 0) {
          estado = '🔴 SIN STOCK';
        } else if (data.stock <= (data.umbral_bajo_stock || 5)) {
          estado = '🟡 Poco stock';
        }

        addMessage(
          `📦 ${data.nombre}\n\n` +
          `Stock: ${data.stock} unidades\n` +
          `${estado}`
        );
      } else {
        addMessage('❌ No encontré ese producto.');
      }
    } catch (error) {
      addMessage('❌ Hubo un error.');
    } finally {
      setIsLoading(false);
      setConversationState({});
      setTimeout(() => showInventoryMenu(), 1500);
    }
  };

  const handleStockBajo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stock-bajo');
      const data = await response.json();

      if (data && data.length > 0) {
        let mensaje = '⚠️ Productos con poco stock:\n\n';
        data.forEach((producto, index) => {
          mensaje += `${index + 1}. ${producto.nombre} (${producto.stock})\n`;
        });
        addMessage(mensaje);
      } else {
        addMessage('✅ Todo bien, stock normal.');
      }
    } catch (error) {
      addMessage('❌ Hubo un error.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showInventoryMenu(), 2000);
    }
  };

  const handleGananciaDia = async () => {
    setIsLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/ganancia-dia?fecha=${hoy}`);
      const data = await response.json();

      addMessage(
        `✨ Ganancia de hoy:\n\n` +
        `$${data.total_ventas?.toLocaleString('es-CL') || 0}\n\n` +
        `💰 Total de ${data.cantidad_ventas || 0} ventas`
      );
    } catch (error) {
      addMessage('❌ No pude calcular la ganancia.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenCajaMenu(), 1500);
    }
  };

  const handleIngresoCaja = async () => {
    setIsLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/resumen-caja?fecha=${hoy}`);
      const data = await response.json();

      let mensaje = `💵 Ingreso en caja hoy:\n\n`;
      mensaje += `💰 Total efectivo: $${data.total_efectivo?.toLocaleString('es-CL') || 0}\n\n`;
      
      mensaje += `🛒 Ventas en efectivo: $${data.total_ventas_efectivo?.toLocaleString('es-CL') || 0} (${data.cantidad_ventas_efectivo || 0} ventas)\n`;
      mensaje += `📝 Ingresos manuales: $${data.total_ingresos_manuales?.toLocaleString('es-CL') || 0} (${data.cantidad_ingresos_manuales || 0})\n`;
      
      if (data.cantidad_ingresos_manuales > 0) {
        mensaje += `\n📋 Detalle ingresos manuales:\n`;
        data.detalle_manuales.forEach(ingreso => {
          mensaje += `• $${ingreso.monto?.toLocaleString('es-CL')} - ${ingreso.concepto} (${ingreso.hora})\n`;
        });
      }

      addMessage(mensaje);
    } catch (error) {
      addMessage('❌ No pude obtener el ingreso.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenCajaMenu(), 1500);
    }
  };

  const handleDineroRetirado = async () => {
    setIsLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/dinero-retirado?fecha=${hoy}`);
      const data = await response.json();

      let mensaje = `💸 Retiros de caja:\n\n`;
      
      if (data.total_dia > 0) {
        mensaje += `📅 Retiros de hoy: $${data.total_dia?.toLocaleString('es-CL')}\n`;
        mensaje += `📊 Acumulado anterior: $${data.total_acumulado_anterior?.toLocaleString('es-CL')}\n\n`;
        
        mensaje += `� Detalle de hoy:\n`;
        data.retiros_dia.forEach((retiro, index) => {
          mensaje += `${index + 1}. $${retiro.monto?.toLocaleString('es-CL')} - ${retiro.motivo} (${retiro.hora})\n`;
        });
      } else {
        mensaje += `✅ No hay retiros hoy\n`;
        if (data.total_acumulado_anterior > 0) {
          mensaje += `📊 Total acumulado: $${data.total_acumulado_anterior?.toLocaleString('es-CL')}`;
        }
      }

      addMessage(mensaje);
    } catch (error) {
      addMessage('❌ No pude obtener los retiros.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenCajaMenu(), 1500);
    }
  };

  const handleTotalVendido = async () => {
    setIsLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/total-vendido?fecha=${hoy}`);
      const data = await response.json();

      addMessage(
        `🧮 Total vendido hoy:\n\n` +
        `$${data.monto_total?.toLocaleString('es-CL') || 0}`
      );
    } catch (error) {
      addMessage('❌ No pude obtener las ventas.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenProductosMenu(), 1500);
    }
  };

  const handleTotalPoleras = async () => {
    setIsLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/total-poleras?fecha=${hoy}`);
      const data = await response.json();

      addMessage(
        `👕 Poleras vendidas hoy:\n\n` +
        `${data.cantidad_poleras || 0} unidades`
      );
    } catch (error) {
      addMessage('❌ No pude contar las poleras.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenProductosMenu(), 1500);
    }
  };

  const handleMasVendido = async () => {
    setIsLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/modelo-mas-vendido?fecha=${hoy}`);
      const data = await response.json();

      if (data && data.nombre) {
        addMessage(
          `🏆 Más vendido hoy:\n\n` +
          `${data.nombre}\n` +
          `(${data.cantidad_vendida} vendidos)`
        );
      } else {
        addMessage('❌ No hay ventas hoy.');
      }
    } catch (error) {
      addMessage('❌ No pude obtener esa info.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenProductosMenu(), 1500);
    }
  };

  const handleOptionClick = (optionId) => {
    // Menú principal
    if (optionId === 'inventario') {
      showInventoryMenu();
    } else if (optionId === 'resumen') {
      showResumenMenu();
    } else if (optionId === 'volver-main') {
      showMainMenu();
    } 
    // Inventario
    else if (optionId === 'inventario-completo') {
      handleInventarioCompleto();
    } else if (optionId === 'buscar-producto') {
      handleBuscarProducto();
    } else if (optionId === 'stock-bajo') {
      handleStockBajo();
    }
    // Resumen - Submenús
    else if (optionId === 'resumen-caja') {
      showResumenCajaMenu();
    } else if (optionId === 'resumen-productos') {
      showResumenProductosMenu();
    } else if (optionId === 'volver-resumen') {
      showResumenMenu();
    }
    // Caja
    else if (optionId === 'ganancia-dia') {
      handleGananciaDia();
    } else if (optionId === 'ingreso-caja') {
      handleIngresoCaja();
    } else if (optionId === 'dinero-retirado') {
      handleDineroRetirado();
    }
    // Productos
    else if (optionId === 'total-vendido') {
      handleTotalVendido();
    } else if (optionId === 'total-poleras') {
      handleTotalPoleras();
    } else if (optionId === 'modelo-mas-vendido') {
      handleMasVendido();
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    addMessage(userMessage, false);
    setInputValue('');

    if (conversationState.waitingFor === 'product-name') {
      searchProduct(userMessage);
    } else {
      addMessage('Selecciona una opción de arriba 👆');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              ¿Necesitas ayuda?
              <div className="absolute top-full right-4 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
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
                <h3 className="font-semibold">Asistente</h3>
                <p className="text-xs text-indigo-100">¿En qué te ayudo?</p>
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
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isBot
                      ? 'bg-white text-gray-800 shadow-md'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm">{message.text}</p>
                  
                  {message.options && (
                    <div className="mt-3 space-y-2">
                      {message.options.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleOptionClick(option.id)}
                          className="w-full text-left px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors text-sm font-medium"
                          disabled={isLoading}
                        >
                          {option.label}
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
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label="Enviar mensaje"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;