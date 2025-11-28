"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Trash2 } from 'lucide-react';

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
        { id: 'resumen', label: '📊 Resumen del Día' },
        { id: 'borrar-chat', label: '🗑️ Borrar chat' }
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
    setCurrentMenu('resumen-fecha');
    setConversationState({ waitingFor: 'resumen-fecha' });
    addMessage(
      '📊 ¿Para qué día quieres el resumen?',
      true,
      [
        { id: 'hoy', label: '📅 Hoy' },
        { id: 'otra-fecha', label: '📆 Otro día' },
        { id: 'volver-main', label: '⬅️ Volver' }
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
      console.log('🔍 Buscando producto:', productName);
      
      // ✅ Agregar tienda_id = 1 en la consulta
      const response = await fetch(`/api/productos/buscar?nombre=${encodeURIComponent(productName)}&tienda_id=1`);
      const data = await response.json();

      console.log('📊 Respuesta API:', data);

      if (data.error) {
        console.error('❌ Error en API:', data.error);
        addMessage('❌ Hubo un error al buscar el producto.');
        return;
      }

      if (!data.productos || data.productos.length === 0) {
        addMessage(`❌ No encontré productos con el nombre "${productName}" en el inventario.`);
        return;
      }

      // Mostrar todos los productos encontrados
      let mensaje = `🔍 Encontré ${data.productos.length} producto(s) para "${data.busqueda}":\n\n`;
      
      data.productos.forEach((producto, index) => {
        const stockTotal = producto.stock_total || 0;
        const estado = stockTotal === 0 ? '🔴' : stockTotal <= 5 ? '🟡' : '🟢';
        
        mensaje += `${index + 1}. 📦 ${producto.nombre}\n`;
        mensaje += `   ${estado} Stock total: ${stockTotal}u\n`;
        
        // Mostrar detalles del producto
        if (producto.diseno || producto.tipo_prenda || producto.color) {
          mensaje += `   🎨 ${producto.diseno || 'N/A'} | ${producto.tipo_prenda || 'N/A'} | ${producto.color || 'N/A'}\n`;
        }
        
        // Mostrar stock por talla
        if (producto.todas_las_tallas && producto.todas_las_tallas.length > 0) {
          mensaje += `   📏 Tallas: `;
          
          // Ordenar tallas
          const ordenTallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
          const tallasOrdenadas = [...producto.todas_las_tallas].sort((a, b) => {
            const indexA = ordenTallas.indexOf(a.talla);
            const indexB = ordenTallas.indexOf(b.talla);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.talla.localeCompare(b.talla);
          });

          const tallasInfo = tallasOrdenadas.map(talla => {
            const stockIcon = talla.stock > 0 ? '✅' : '❌';
            return `${stockIcon}${talla.talla}:${talla.stock}`;
          });
          
          mensaje += tallasInfo.join(' | ') + '\n';
        }
        
        mensaje += '\n';
      });

      addMessage(mensaje);
    } catch (error) {
      console.error('❌ Error completo:', error);
      addMessage('❌ Hubo un error al buscar el producto. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
      setConversationState({});
      setTimeout(() => showInventoryMenu(), 1500);
    }
  };

  const handleStockBajo = async () => {
    setIsLoading(true);
    let data = null;
    try {
      console.log('🔍 Consultando stock bajo...');
      
      // ✅ Agregar tienda_id = 1 en la consulta
      const response = await fetch('/api/stock-bajo?tienda_id=1');
      data = await response.json();

      console.log('📊 Respuesta API stock bajo:', data);

      if (data.error) {
        console.error('❌ Error en API:', data.error);
        addMessage('❌ Hubo un error al verificar el stock.');
        return;
      }

      if (!data.productos || data.productos.length === 0) {
        addMessage('✅ Todo bien, no hay productos con stock bajo.');
      } else {
        let mensaje = `⚠️ Encontré ${data.productos.length} productos con stock bajo:\n\n`;
        
        // Mostrar hasta 5 productos en el chatbot
        const productosMostrar = data.productos.slice(0, 5);
        productosMostrar.forEach((producto, index) => {
          const stockTotal = producto.stock_total || 0;
          const estado = stockTotal === 0 ? '🔴' : '🟡';
          mensaje += `${index + 1}. ${producto.nombre} - ${estado} ${stockTotal}u total\n`;
          
          // Mostrar tallas con bajo stock
          if (producto.variantes_bajo && producto.variantes_bajo.length > 0) {
            producto.variantes_bajo.forEach(variante => {
              const icono = variante.stock_actual === 0 ? '❌' : '⚠️';
              mensaje += `   ${icono} Talla ${variante.talla}: ${variante.stock_actual}u\n`;
            });
          }
        });

        // Si hay más de 5 productos, ofrecer redirección
        if (data.productos.length > 5) {
          mensaje += `\n📋 Hay ${data.productos.length - 5} productos más.\n`;
          mensaje += `💹 ¿Quieres ver el listado completo en el inventario?`;
          
          addMessage(mensaje, true, [
            { id: 'ver-inventario-stock', label: '📋 Ver inventario completo' },
            { id: 'volver-inventario', label: '⬅️ Volver' }
          ]);
        } else {
          addMessage(mensaje);
        }
      }
    } catch (error) {
      console.error('❌ Error completo:', error);
      addMessage('❌ Hubo un error al verificar el stock. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
      if (!data?.productos || data?.productos.length <= 5) {
        setTimeout(() => showInventoryMenu(), 2000);
      }
    }
  };

  const handleBorrarChat = () => {
    setMessages([]);
    setCurrentMenu('main');
    setConversationState({});
    setIsLoading(false);
    setInputValue('');
    
    setTimeout(() => {
      addMessage('✨ Chat borrado exitosamente. ¡Empecemos de nuevo!', true);
      setTimeout(() => {
        showMainMenu();
      }, 1500);
    }, 500);
  };

  const handleOptionClick = (optionId) => {
    if (optionId === 'inventario') {
      showInventoryMenu();
    } else if (optionId === 'resumen') {
      showResumenMenu();
    } else if (optionId === 'borrar-chat') {
      handleBorrarChat();
    } else if (optionId === 'volver-main') {
      showMainMenu();
    } else if (optionId === 'inventario-completo') {
      handleInventarioCompleto();
    } else if (optionId === 'buscar-producto') {
      handleBuscarProducto();
    } else if (optionId === 'stock-bajo') {
      handleStockBajo();
    } else if (optionId === 'ver-inventario-stock') {
      handleInventarioCompleto();
    } else if (optionId === 'volver-inventario') {
      showInventoryMenu();
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
                <h3 className="font-semibold">Asistente de Inventario</h3>
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
                onClick={handleBorrarChat}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label="Borrar chat"
                title="Borrar todo el historial del chat"
              >
                <Trash2 size={20} />
              </button>
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