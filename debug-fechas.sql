-- Script para depurar fechas en la base de datos
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar fechas en ventas
SELECT 
    'VENTAS' as tabla,
    id,
    total,
    created_at,
    DATE(created_at) as fecha_solo_fecha,
    EXTRACT(HOUR FROM created_at) as hora
FROM ventas 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Verificar fechas en caja_movimientos
SELECT 
    'CAJA_MOVIMIENTOS' as tabla,
    id,
    tipo,
    monto,
    concepto,
    fecha,
    DATE(fecha) as fecha_solo_fecha,
    EXTRACT(HOUR FROM fecha) as hora
FROM caja_movimientos 
ORDER BY fecha DESC 
LIMIT 10;

-- 3. Verificar fechas de hoy específicamente
SELECT 
    'VENTAS_HOY' as tabla,
    COUNT(*) as cantidad,
    SUM(total) as total
FROM ventas 
WHERE DATE(created_at) = CURRENT_DATE;

SELECT 
    'MOVIMIENTOS_HOY' as tabla,
    tipo,
    COUNT(*) as cantidad,
    SUM(monto) as total
FROM caja_movimientos 
WHERE DATE(fecha) = CURRENT_DATE
GROUP BY tipo;

-- 4. Verificar fecha actual del servidor
SELECT 
    'SERVER_DATE' as info,
    CURRENT_DATE as hoy,
    NOW() as ahora,
    CURRENT_TIMESTAMP as timestamp_actual;
