-- Crear vista para el modal de agregar stock que filtre por tienda principal (tienda_id = 1)
DROP VIEW IF EXISTS variantes_admin_view;

CREATE VIEW variantes_admin_view AS
SELECT 
    p.id as producto_id,
    d.nombre as diseno,
    tp.nombre as tipo_prenda,
    c.nombre as color,
    p.activo as producto_activo,
    v.id as variante_id,
    v.talla,
    v.stock_actual
FROM productos p
INNER JOIN disenos d ON p.diseno_id = d.id
INNER JOIN tipos_prenda tp ON p.tipo_prenda_id = tp.id
INNER JOIN colores c ON p.color_id = c.id
LEFT JOIN variantes v ON p.id = v.producto_id
WHERE p.tienda_id = 1  -- Solo productos de la tienda principal
AND p.activo = true;

-- Dar permisos de lectura a usuarios autenticados
GRANT SELECT ON variantes_admin_view TO authenticated;
