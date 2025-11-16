-- Script 1: Dejar todo el stock en 0
UPDATE variantes SET stock_actual = 0;

-- Opcional: Limpiar movimientos de inventario si no quieres historial
-- TRUNCATE movimientos_inventario;
