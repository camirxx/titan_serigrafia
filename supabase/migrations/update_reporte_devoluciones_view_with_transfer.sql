-- Actualizar la vista de reporte de devoluciones para incluir datos de transferencia
-- Primero eliminamos la vista existente para evitar conflictos de columnas
DROP VIEW IF EXISTS reporte_devoluciones_view;

-- Crear la vista con todas las columnas necesarias
CREATE VIEW reporte_devoluciones_view AS
SELECT 
    d.id as devolucion_id,
    d.created_at as fecha_devolucion,
    d.tipo,
    d.metodo_resolucion,
    d.monto_reintegro,
    d.observacion,
    d.venta_id,
    d.metodo_pago_reintegro,
    d.transferencia_rut,
    d.transferencia_nombre,
    d.transferencia_banco,
    d.transferencia_tipo_cuenta,
    d.transferencia_numero_cuenta,
    d.transferencia_email,
    d.transferencia_realizada,
    d.fecha_transferencia,
    d.tipo_diferencia,
    d.monto_diferencia,
    d.metodo_pago_diferencia,
    v.fecha as fecha_venta_original,
    v.total as total_venta_original,
    v.metodo_pago as metodo_pago_venta,
    v.numero_boleta,
    u.nombre as usuario_nombre,
    t.nombre as tienda_nombre,
    COUNT(DISTINCT di.id) as cantidad_items,
    COALESCE(SUM(di.cantidad), 0) as total_unidades_devueltas,
    COALESCE(SUM(di.cantidad * dv.precio_unitario), 0) as monto_total_devuelto
FROM devoluciones d
INNER JOIN ventas v ON d.venta_id = v.id
INNER JOIN usuarios u ON d.usuario_id = u.id
INNER JOIN tiendas t ON u.tienda_id = t.id
LEFT JOIN devoluciones_items di ON d.id = di.devolucion_id
LEFT JOIN detalle_ventas dv ON di.detalle_venta_id = dv.id
GROUP BY 
    d.id, d.created_at, d.tipo, d.metodo_resolucion, d.monto_reintegro, 
    d.observacion, d.venta_id, d.metodo_pago_reintegro,
    d.transferencia_rut, d.transferencia_nombre, d.transferencia_banco,
    d.transferencia_tipo_cuenta, d.transferencia_numero_cuenta, d.transferencia_email,
    d.transferencia_realizada, d.fecha_transferencia,
    d.tipo_diferencia, d.monto_diferencia, d.metodo_pago_diferencia,
    v.fecha, v.total, v.metodo_pago, v.numero_boleta,
    u.nombre, t.nombre
ORDER BY d.created_at DESC;

-- Dar permisos de lectura a usuarios autenticados
GRANT SELECT ON reporte_devoluciones_view TO authenticated;
