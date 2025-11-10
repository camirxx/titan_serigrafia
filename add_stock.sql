-- Script 2: Agregar 2 unidades por talla a todos los productos
-- Este script crea variantes para cada producto con cada talla si no existen
-- y establece stock_actual = 2

DO \$\$
DECLARE
    producto_record RECORD;
    talla_text TEXT;
    tallas_array TEXT[] := ARRAY['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
BEGIN
    -- Para cada producto activo
    FOR producto_record IN 
        SELECT id FROM productos WHERE activo = true
    LOOP
        -- Para cada talla
        FOREACH talla_text IN ARRAY tallas_array
        LOOP
            -- Insertar o actualizar la variante
            INSERT INTO variantes (producto_id, talla, stock_actual)
            VALUES (producto_record.id, talla_text, 2)
            ON CONFLICT (producto_id, talla) 
            DO UPDATE SET stock_actual = 2;
            
            -- Registrar movimiento de entrada
            INSERT INTO movimientos_inventario (variante_id, tipo, cantidad, referencia)
            SELECT 
                v.id, 
                'entrada', 
                2, 
                'Stock inicial - ajuste masivo'
            FROM variantes v 
            WHERE v.producto_id = producto_record.id 
            AND v.talla = talla_text;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Stock ajustado correctamente para todos los productos';
END \$\$;
