-- Script para depurar ventas por método de pago
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar todas las ventas de hoy
SELECT 
    'VENTAS_HOY' as tipo,
    id,
    total,
    metodo_pago,
    created_at,
    DATE(created_at) as fecha_solo_fecha
FROM ventas 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- 2. Contar ventas por método de pago hoy
SELECT 
    'CONTEO_HOY' as tipo,
    metodo_pago,
    COUNT(*) as cantidad,
    SUM(total) as total_monto
FROM ventas 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY metodo_pago;

-- 3. Verificar si hay ventas con método_pago nulo o vacío
SELECT 
    'METODO_PAGO_NULO' as tipo,
    id,
    total,
    metodo_pago,
    created_at
FROM ventas 
WHERE DATE(created_at) = CURRENT_DATE
AND (metodo_pago IS NULL OR metodo_pago = '' OR metodo_pago = 'null');

-- 4. Verificar todos los métodos de pago diferentes que existen
SELECT 
    'METODOS_PAGO_EXISTENTES' as tipo,
    metodo_pago,
    COUNT(*) as cantidad_ventas
FROM ventas 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY metodo_pago;

-- 5. Verificar ventas de los últimos 7 días para comparar
SELECT 
    'ULTIMOS_7_DIAS' as tipo,
    DATE(created_at) as fecha,
    metodo_pago,
    COUNT(*) as cantidad,
    SUM(total) as total_monto
FROM ventas 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), metodo_pago
ORDER BY fecha DESC, metodo_pago;
