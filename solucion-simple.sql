-- SOLUCIÓN SIMPLE PARA PRODUCTOS Y VENTAS
-- Ejecutar esto si las consultas complejas no funcionan

-- Opción 1: Si no existe tabla detalle_ventas, crear una vista simple
CREATE OR REPLACE VIEW vista_ventas_productos AS
SELECT 
    v.id as venta_id,
    v.total,
    v.created_at,
    p.nombre as producto_nombre,
    p.tipo_prenda as categoria,
    p.diseno,
    1 as cantidad -- Asumir 1 unidad por venta si no hay detalles
FROM ventas v
LEFT JOIN productos p ON 1=1 -- Esto es un placeholder, necesitas la relación real
WHERE DATE(v.created_at) = CURRENT_DATE
LIMIT 10;

-- Opción 2: Si las ventas tienen los productos directamente en la tabla
-- (Revisar si hay columnas como producto_id, producto_nombre, etc.)
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'ventas' 
AND table_schema = 'public'
AND (column_name LIKE '%producto%' OR column_name LIKE '%categoria%');

-- Opción 3: Crear una función simple que simule los datos
CREATE OR REPLACE FUNCTION obtener_resumen_ventas(fecha_param DATE)
RETURNS TABLE(
    categoria TEXT,
    cantidad INTEGER
) AS $$
BEGIN
    -- Simular datos de ejemplo - reemplazar con datos reales
    RETURN QUERY
    SELECT 'Poleras'::TEXT, 5::INTEGER
    UNION ALL
    SELECT 'Polerones'::TEXT, 3::INTEGER
    UNION ALL
    SELECT 'Gorros'::TEXT, 2::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Probar la función
SELECT * FROM obtener_resumen_ventas(CURRENT_DATE);
