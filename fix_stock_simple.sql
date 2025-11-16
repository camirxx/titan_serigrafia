-- Script corregido para asegurar que TODOS los productos activos tengan TODAS las tallas con stock = 2
DO $$
DECLARE
    producto_record RECORD;
    talla_text TEXT;
    tallas_array TEXT[] := ARRAY['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    variante_count INT;
BEGIN
    RAISE NOTICE 'Iniciando proceso de stock masivo...';
    
    -- Para cada producto activo
    FOR producto_record IN 
        SELECT id FROM productos WHERE activo = true
        ORDER BY id
    LOOP
        RAISE NOTICE 'Procesando producto ID: %', producto_record.id;
        
        -- Para cada talla
        FOREACH talla_text IN ARRAY tallas_array
        LOOP
            -- Verificar si ya existe la variante
            SELECT COUNT(*) INTO variante_count 
            FROM variantes 
            WHERE producto_id = producto_record.id AND talla = talla_text;
            
            IF variante_count = 0 THEN
                -- Crear variante si no existe
                INSERT INTO variantes (producto_id, talla, stock_actual)
                VALUES (producto_record.id, talla_text, 2);
                RAISE NOTICE '  Creada variante: % - %', talla_text, producto_record.id;
            ELSE
                -- Actualizar stock si existe
                UPDATE variantes 
                SET stock_actual = 2 
                WHERE producto_id = producto_record.id AND talla = talla_text;
                RAISE NOTICE '  Actualizada variante: % - %', talla_text, producto_record.id;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Proceso completado exitosamente!';
END $$;
