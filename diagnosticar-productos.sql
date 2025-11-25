-- Script para diagnosticar y arreglar problemas con productos y ventas
-- Ejecutar en Supabase SQL Editor paso por paso

-- 1. Verificar qué tablas existen
SELECT 
    'TABLAS_EXISTENTES' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%venta%' OR table_name LIKE '%producto%' OR table_name LIKE '%detalle%')
ORDER BY table_name;

-- 2. Verificar estructura de la tabla ventas
SELECT 
    'ESTRUCTURA_VENTAS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ventas' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar estructura de la tabla productos
SELECT 
    'ESTRUCTURA_PRODUCTOS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'productos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar si existe tabla detalle_ventas
SELECT 
    'ESTRUCTURA_DETALLE_VENTAS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'detalle_ventas' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar datos de ejemplo en ventas
SELECT 
    'DATOS_VENTAS' as info,
    id,
    total,
    created_at,
    metodo_pago
FROM ventas 
ORDER BY created_at DESC 
LIMIT 3;

-- 6. Verificar datos de ejemplo en productos
SELECT 
    'DATOS_PRODUCTOS' as info,
    id,
    nombre,
    tipo_prenda,
    categoria,
    diseno
FROM productos 
LIMIT 3;

-- 7. Verificar si hay ventas con detalles
SELECT 
    'VENTAS_CON_DETALLES' as info,
    v.id as venta_id,
    v.total,
    COUNT(dv.id) as cantidad_detalles
FROM ventas v
LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
GROUP BY v.id, v.total
LIMIT 3;

-- 8. Verificar categorías únicas en productos
SELECT 
    'CATEGORIAS_PRODUCTOS' as info,
    tipo_prenda,
    categoria,
    COUNT(*) as cantidad
FROM productos 
GROUP BY tipo_prenda, categoria
ORDER BY cantidad DESC;
