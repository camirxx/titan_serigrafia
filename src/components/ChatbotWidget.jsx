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

      if (data.error) {
        addMessage('❌ Hubo un error al buscar el producto.');
        return;
      }

      if (!data.productos || data.productos.length === 0) {
        addMessage('❌ No encontré ese producto.');
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
      addMessage('❌ Hubo un error al buscar el producto.');
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

      if (data.error) {
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
      addMessage('❌ Hubo un error al verificar el stock.');
    } finally {
      setIsLoading(false);
      if (!data?.productos || data.productos.length <= 5) {
        setTimeout(() => showInventoryMenu(), 2000);
      }
    }
  };

  const handleGananciaDiaConFecha = async () => {
    const fecha = conversationState.fecha || new Date().toISOString().split('T')[0];
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ganancia-dia?fecha=${fecha}`);
      const data = await response.json();

      if (data && !data.error) {
        addMessage(
          `💰 Ganancia del día (${fecha}):\n\n` +
          `📊 Total ventas: $${data.total_ventas.toLocaleString('es-CL')}\n` +
          `🛒 Cantidad de ventas: ${data.cantidad_ventas}`
        );
      } else {
        addMessage('❌ No hay ganancias para esa fecha.');
      }
    } catch (error) {
      addMessage('❌ No pude obtener esa info.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenCajaMenu(), 1500);
    }
  };

  const handleTotalVendido = async () => {
    const fecha = conversationState.fecha || new Date().toISOString().split('T')[0];
    setIsLoading(true);
    try {
      const response = await fetch(`/api/total-vendido?fecha=${fecha}`);
      const data = await response.json();

      if (data && !data.error) {
        let mensaje = `🧮 Total vendido (${fecha}):\n\n`;
        mensaje += `📦 Total productos: ${data.cantidad_total} unidades\n\n`;
        
        if (data.categorias && data.categorias.length > 0) {
          mensaje += `📋 Desglose por categorías:\n`;
          data.categorias.forEach((cat, index) => {
            mensaje += `${index + 1}. ${cat.nombre_formateado}: ${cat.cantidad} unidades\n`;
          });
          
          if (data.resumen) {
            mensaje += `\n🏆 Más vendido: ${data.resumen.categoria_mas_vendida}`;
          }
        } else {
          mensaje += `📋 No hay ventas registradas para esta fecha`;
        }

        addMessage(mensaje);
      } else {
        addMessage('❌ No hay ventas para esa fecha.');
      }
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
    const fecha = conversationState.fecha || new Date().toISOString().split('T')[0];
    setIsLoading(true);
    try {
      const response = await fetch(`/api/modelo-mas-vendido?fecha=${fecha}`);
      const data = await response.json();

      if (data && !data.error) {
        let mensaje = `🏆 Modelo más vendido (${fecha}):\n\n`;
        
        if (data.hay_empate) {
          mensaje += `🤝 ¡Hay un empate!\n\n`;
          mensaje += `Varios modelos vendieron ${data.cantidad_vendida} unidades:\n\n`;
          
          if (data.modelos_empate && data.modelos_empate.length > 0) {
            data.modelos_empate.forEach((modelo, index) => {
              mensaje += `${index + 1}. ${modelo.nombre} (${modelo.tipo_prenda})\n`;
            });
          }
          
          mensaje += `\n📊 No hay un modelo único más vendido hoy.`;
        } else if (data.nombre) {
          mensaje += `🎉 El modelo más vendido es:\n\n`;
          mensaje += `✨ ${data.nombre}\n`;
          if (data.diseno && data.diseno !== 'Diseño clásico') {
            mensaje += `🎨 ${data.diseno}\n`;
          }
          mensaje += `📦 ${data.tipo_prenda}\n`;
          mensaje += `🔢 ${data.cantidad_vendida} unidades vendidas`;
        } else {
          mensaje += `📋 ${data.mensaje || 'No hay ventas registradas para esta fecha'}`;
        }

        addMessage(mensaje);
      } else {
        addMessage('❌ No hay ventas para esa fecha.');
      }
    } catch (error) {
      addMessage('❌ No pude obtener esa info.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenProductosMenu(), 1500);
    }
  };

  const handleRegistrarIngreso = () => {
    setConversationState({ waitingFor: 'ingreso-monto' });
    addMessage('💰 Escribe el monto del ingreso (ejemplo: 5000):');
  };

  const handleRegistrarRetiro = () => {
    setConversationState({ waitingFor: 'retiro-monto' });
    addMessage('💸 Escribe el monto del retiro (ejemplo: 2000):');
  };

  const handleIngresoInput = async (input) => {
    const monto = parseInt(input);
    
    if (isNaN(monto) || monto <= 0) {
      addMessage('❌ Monto inválido. Escribe un número mayor a 0 (ejemplo: 5000)');
      return;
    }

    setConversationState({ waitingFor: 'ingreso-concepto', monto: monto });
    addMessage(`💰 Ingreso de $${monto.toLocaleString('es-CL')}\n\n📝 Ahora escribe el concepto (ejemplo: pago cliente, arriendo, etc.):`);
  };

  const handleRetiroInput = async (input) => {
    const monto = parseInt(input);
    
    if (isNaN(monto) || monto <= 0) {
      addMessage('❌ Monto inválido. Escribe un número mayor a 0 (ejemplo: 2000)');
      return;
    }

    setConversationState({ waitingFor: 'retiro-concepto', monto: monto });
    addMessage(`💸 Retiro de $${monto.toLocaleString('es-CL')}\n\n📝 Ahora escribe el motivo (ejemplo: compra insumos, gastos, etc.):`);
  };

  const handleIngresoConcepto = async (concepto) => {
    const monto = conversationState.monto;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/registrar-ingreso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monto: monto,
          concepto: concepto
        }),
      });

      const data = await response.json();

      if (data.success) {
        addMessage(
          `✅ Ingreso registrado exitosamente:\n\n` +
          `💰 Monto: $${monto.toLocaleString('es-CL')}\n` +
          `📝 Concepto: ${concepto}\n` +
          `🕐 Hora: ${data.ingreso.hora}\n\n` +
          `📋 El ingreso ha sido agregado al resumen de caja.`
        );
      } else {
        addMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      addMessage('❌ No pude registrar el ingreso.');
    } finally {
      setIsLoading(false);
      setConversationState({});
      setTimeout(() => showResumenCajaMenu(), 2000);
    }
  };

  const handleRetiroConcepto = async (concepto) => {
    const monto = conversationState.monto;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/registrar-retiro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monto: monto,
          concepto: concepto
        }),
      });

      const data = await response.json();

      if (data.success) {
        addMessage(
          `✅ Retiro registrado exitosamente:\n\n` +
          `💸 Monto: $${monto.toLocaleString('es-CL')}\n` +
          `📝 Motivo: ${concepto}\n` +
          `🕐 Hora: ${data.retiro.hora}\n\n` +
          `📋 El retiro ha sido descontado de la caja.`
        );
      } else {
        addMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      addMessage('❌ No pude registrar el retiro.');
    } finally {
      setIsLoading(false);
      setConversationState({});
      setTimeout(() => showResumenCajaMenu(), 2000);
    }
  };

  const handleFechaHoy = () => {
    const hoy = new Date();
    const fechaParaAPI = hoy.toISOString().split('T')[0]; // YYYY-MM-DD
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`; // DD-MM-YYYY
    
    const nextAction = conversationState.nextAction;
    
    setConversationState({ fecha: fechaParaAPI });
    addMessage(`📅 Mostrando resumen de hoy (${fechaFormateada})`);
    
    // Ejecutar la acción guardada
    setTimeout(() => {
      if (nextAction === 'ganancia-dia') {
        handleGananciaDiaConFecha();
      } else if (nextAction === 'ingreso-caja') {
        handleIngresoCajaConFecha();
      } else if (nextAction === 'dinero-retirado') {
        handleDineroRetiradoConFecha();
      } else {
        // Si no hay acción guardada, mostrar menú de opciones
        showResumenOpciones();
      }
    }, 1000);
  };

  const handleOtraFecha = () => {
    setConversationState({ 
      waitingFor: 'fecha-input',
      nextAction: conversationState.nextAction 
    });
    addMessage('📆 Escribe la fecha (formato: DD-MM-YYYY, ejemplo: 15-01-2024):');
  };

  const showResumenOpciones = () => {
    setCurrentMenu('resumen-opciones');
    addMessage(
      '📊 ¿Qué quieres consultar?',
      true,
      [
        { id: 'resumen-caja', label: '💰 Caja' },
        { id: 'resumen-productos', label: '🛒 Productos' },
        { id: 'volver-resumen', label: '⬅️ Volver' }
      ]
    );
  };

  const handleFechaInput = (fechaInput) => {
    // Validar formato de fecha DD-MM-YYYY
    const fechaRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!fechaRegex.test(fechaInput)) {
      addMessage('❌ Formato inválido. Usa: DD-MM-YYYY (ejemplo: 15-01-2024)');
      return;
    }

    // Convertir DD-MM-YYYY a YYYY-MM-DD para la API
    const [dia, mes, año] = fechaInput.split('-');
    const fechaParaAPI = `${año}-${mes}-${dia}`;
    
    // Validar que sea una fecha válida
    const fecha = new Date(fechaParaAPI);
    if (isNaN(fecha.getTime())) {
      addMessage('❌ Fecha inválida. Intenta nuevamente.');
      return;
    }

    const nextAction = conversationState.nextAction;

    setConversationState({ fecha: fechaParaAPI });
    addMessage(`📆 Mostrando resumen de ${fechaInput}`);
    
    // Ejecutar la acción guardada
    setTimeout(() => {
      if (nextAction === 'ganancia-dia') {
        handleGananciaDiaConFecha();
      } else if (nextAction === 'ingreso-caja') {
        handleIngresoCajaConFecha();
      } else if (nextAction === 'dinero-retirado') {
        handleDineroRetiradoConFecha();
      } else {
        // Si no hay acción guardada, mostrar menú de opciones
        showResumenOpciones();
      }
    }, 1000);
  };

  const handleIngresoCajaConFecha = async () => {
    setIsLoading(true);
    try {
      const fecha = conversationState.fecha || new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/resumen-caja?fecha=${fecha}`);
      const data = await response.json();

      const esHoy = fecha === new Date().toISOString().split('T')[0];
      const diaTexto = esHoy ? 'hoy' : `el ${fecha}`;

      let mensaje = `💵 Ingreso en caja ${diaTexto}:\n\n`;
      mensaje += `💰 Total efectivo: $${data.total_efectivo?.toLocaleString('es-CL') || 0}\n\n`;
      
      mensaje += `🛒 Ventas en efectivo: $${data.total_ventas_efectivo?.toLocaleString('es-CL') || 0} (${data.cantidad_ventas_efectivo || 0} ventas)\n`;
      mensaje += `📝 Ingresos manuales: $${data.total_ingresos_manuales?.toLocaleString('es-CL') || 0} (${data.cantidad_ingresos_manuales || 0})\n`;
      
      // Mostrar detalle de ingresos manuales
      if (data.cantidad_ingresos_manuales > 0 && data.detalle_manuales) {
        mensaje += `\n📋 Detalle ingresos manuales:\n`;
        data.detalle_manuales.forEach(ingreso => {
          mensaje += `• $${ingreso.monto?.toLocaleString('es-CL')} - ${ingreso.concepto} (${ingreso.hora})\n`;
        });
      } else if (data.cantidad_ingresos_manuales === 0) {
        mensaje += `\n📋 No hubo ingresos manuales ${diaTexto}\n`;
      }

      addMessage(mensaje);
    } catch (error) {
      addMessage('❌ No pude obtener el ingreso.');
    } finally {
      setIsLoading(false);
      setTimeout(() => showResumenCajaMenu(), 1500);
    }
  };

  const handleDineroRetiradoConFecha = async () => {
    setIsLoading(true);
    try {
      const fecha = conversationState.fecha || new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/dinero-retirado?fecha=${fecha}`);
      const data = await response.json();

      const esHoy = fecha === new Date().toISOString().split('T')[0];
      const diaTexto = esHoy ? 'hoy' : `el ${fecha}`;

      let mensaje = `💸 Retiros de caja ${diaTexto}:\n\n`;
      
      if (data.total_dia > 0) {
        mensaje += `📅 Retiros ${diaTexto}: $${data.total_dia?.toLocaleString('es-CL')}\n`;
        if (data.total_acumulado_anterior > 0) {
          mensaje += `📊 Acumulado anterior: $${data.total_acumulado_anterior?.toLocaleString('es-CL')}\n`;
        }
        mensaje += `\n📝 Detalle ${diaTexto}:\n`;
        data.retiros_dia.forEach((retiro, index) => {
          mensaje += `${index + 1}. $${retiro.monto?.toLocaleString('es-CL')} - ${retiro.motivo} (${retiro.hora})\n`;
        });
      } else {
        mensaje += `✅ No hay retiros ${diaTexto}\n`;
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

  const handleBorrarChat = () => {
    // Limpiar todo el estado
    setMessages([]);
    setCurrentMenu('main');
    setConversationState({});
    setIsLoading(false);
    setInputValue('');
    
    // Mostrar mensaje de confirmación y reiniciar
    setTimeout(() => {
      addMessage('✨ Chat borrado exitosamente. ¡Empecemos de nuevo!', true);
      setTimeout(() => {
        showMainMenu();
      }, 1500);
    }, 500);
  };

  const handleOptionClick = (optionId) => {
    // Menú principal
    if (optionId === 'inventario') {
      showInventoryMenu();
    } else if (optionId === 'resumen') {
      showResumenMenu();
    } else if (optionId === 'borrar-chat') {
      handleBorrarChat();
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
    } else if (optionId === 'ver-inventario-stock') {
      handleInventarioCompleto();
    } else if (optionId === 'volver-inventario') {
      showInventoryMenu();
    }
    // Resumen - Selección de fecha
    else if (optionId === 'hoy') {
      handleFechaHoy();
    } else if (optionId === 'otra-fecha') {
      handleOtraFecha();
    }
    // Resumen - Submenús
    else if (optionId === 'resumen-caja') {
      showResumenCajaMenu();
    } else if (optionId === 'resumen-productos') {
      showResumenProductosMenu();
    } else if (optionId === 'volver-resumen') {
      showResumenMenu();
    }
    // Caja - Primero preguntar por fecha si no está definida
    else if (optionId === 'ganancia-dia' || optionId === 'ingreso-caja' || optionId === 'dinero-retirado') {
      if (!conversationState.fecha) {
        // Guardar la opción que quiere ver y preguntar por fecha
        setConversationState({ 
          waitingFor: 'resumen-fecha',
          nextAction: optionId 
        });
        showResumenMenu();
      } else {
        // Si ya hay fecha, ejecutar la acción directamente
        if (optionId === 'ganancia-dia') {
          handleGananciaDiaConFecha();
        } else if (optionId === 'ingreso-caja') {
          handleIngresoCajaConFecha();
        } else if (optionId === 'dinero-retirado') {
          handleDineroRetiradoConFecha();
        }
      }
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
    } else if (conversationState.waitingFor === 'fecha-input') {
      handleFechaInput(userMessage);
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
