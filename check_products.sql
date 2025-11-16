-- Verificar productos activos
SELECT id, activo FROM productos WHERE activo = true;

-- Verificar variantes por producto
SELECT 
    producto_id,
    COUNT(*) as total_variantes,
    SUM(stock_actual) as stock_total
FROM variantes 
GROUP BY producto_id
ORDER BY producto_id;
