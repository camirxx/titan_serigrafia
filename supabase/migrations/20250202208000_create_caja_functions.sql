-- Función para agregar denominaciones a caja
CREATE OR REPLACE FUNCTION public.caja_agregar_denominaciones(
    p_sesion_id bigint,
    p_denominaciones jsonb,
    p_concepto text DEFAULT 'Ingreso manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    denom_record RECORD;
    v_denominacion int;
    v_cantidad int;
    v_movimiento_id bigint;
BEGIN
    -- Verificar que la sesión de caja existe y está abierta
    IF NOT EXISTS (
        SELECT 1 FROM caja_sesiones 
        WHERE id = p_sesion_id AND estado = 'abierta'
    ) THEN
        RAISE EXCEPTION 'La sesión de caja no existe o no está abierta';
    END IF;

    -- Insertar cada denominación
    FOR denom_record IN SELECT * FROM jsonb_each_text(p_denominaciones)
    LOOP
        v_denominacion := denom_record.key::int;
        v_cantidad := denom_record.value::int;
        
        -- Insertar o actualizar denominaciones en caja
        INSERT INTO caja_denominaciones (sesion_id, denominacion, cantidad)
        VALUES (p_sesion_id, v_denominacion, v_cantidad)
        ON CONFLICT (sesion_id, denominacion) 
        DO UPDATE SET 
            cantidad = caja_denominaciones.cantidad + EXCLUDED.cantidad,
            updated_at = NOW();
        
        -- Registrar movimiento
        INSERT INTO caja_movimientos (
            sesion_id, 
            tipo, 
            monto, 
            concepto, 
            denominaciones,
            created_at
        ) VALUES (
            p_sesion_id,
            'ingreso',
            v_denominacion * v_cantidad,
            p_concepto,
            jsonb_build_object(v_denominacion::text, v_cantidad),
            NOW()
        ) RETURNING id INTO v_movimiento_id;
        
        -- Enviar email de notificación
        PERFORM pg_notify('caja_movimiento', json_build_object(
            'movimiento_id', v_movimiento_id,
            'tipo', 'ingreso',
            'monto', v_denominacion * v_cantidad,
            'concepto', p_concepto
        )::text);
    END LOOP;
END;
$$;

-- Función para retirar denominaciones de caja
CREATE OR REPLACE FUNCTION public.caja_retirar_denominaciones(
    p_sesion_id bigint,
    p_denominaciones jsonb,
    p_concepto text DEFAULT 'Retiro manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    denom_record RECORD;
    v_denominacion int;
    v_cantidad int;
    v_cantidad_actual int;
    v_movimiento_id bigint;
BEGIN
    -- Verificar que la sesión de caja existe y está abierta
    IF NOT EXISTS (
        SELECT 1 FROM caja_sesiones 
        WHERE id = p_sesion_id AND estado = 'abierta'
    ) THEN
        RAISE EXCEPTION 'La sesión de caja no existe o no está abierta';
    END IF;

    -- Procesar cada denominación
    FOR denom_record IN SELECT * FROM jsonb_each_text(p_denominaciones)
    LOOP
        v_denominacion := denom_record.key::int;
        v_cantidad := denom_record.value::int;
        
        -- Verificar cantidad disponible
        SELECT cantidad INTO v_cantidad_actual
        FROM caja_denominaciones
        WHERE sesion_id = p_sesion_id AND denominacion = v_denominacion;
        
        IF v_cantidad_actual IS NULL OR v_cantidad_actual < v_cantidad THEN
            RAISE EXCEPTION 'No hay suficientes billetes de % en caja. Disponibles: %, Solicitados: %', 
                v_denominacion, COALESCE(v_cantidad_actual, 0), v_cantidad;
        END IF;
        
        -- Actualizar denominaciones en caja
        UPDATE caja_denominaciones
        SET cantidad = cantidad - v_cantidad,
            updated_at = NOW()
        WHERE sesion_id = p_sesion_id AND denominacion = v_denominacion;
        
        -- Eliminar registro si cantidad es 0
        DELETE FROM caja_denominaciones
        WHERE sesion_id = p_sesion_id AND denominacion = v_denominacion AND cantidad = 0;
        
        -- Registrar movimiento
        INSERT INTO caja_movimientos (
            sesion_id, 
            tipo, 
            monto, 
            concepto, 
            denominaciones,
            created_at
        ) VALUES (
            p_sesion_id,
            'egreso',
            v_denominacion * v_cantidad,
            p_concepto,
            jsonb_build_object(v_denominacion::text, v_cantidad),
            NOW()
        ) RETURNING id INTO v_movimiento_id;
        
        -- Enviar email de notificación
        PERFORM pg_notify('caja_movimiento', json_build_object(
            'movimiento_id', v_movimiento_id,
            'tipo', 'egreso',
            'monto', v_denominacion * v_cantidad,
            'concepto', p_concepto
        )::text);
    END LOOP;
END;
$$;

-- Conceder permisos
GRANT EXECUTE ON FUNCTION public.caja_agregar_denominaciones TO authenticated;
GRANT EXECUTE ON FUNCTION public.caja_retirar_denominaciones TO authenticated;
GRANT EXECUTE ON FUNCTION public.caja_agregar_denominaciones TO service_role;
GRANT EXECUTE ON FUNCTION public.caja_retirar_denominaciones TO service_role;
