-- Función RPC para vaciar la caja actual
-- Crear en Supabase SQL Editor

CREATE OR REPLACE FUNCTION vaciar_caja_actual()
RETURNS TEXT AS $$
DECLARE
    sesion_activa_id UUID;
    total_vaciado INTEGER := 0;
BEGIN
    -- Obtener la sesión activa (usar la columna correcta de estado)
    SELECT id INTO sesion_activa_id
    FROM caja_sesiones
    WHERE estado_sesion = 'abierta'  -- Cambiar 'estado' por la columna correcta
    LIMIT 1;

    IF sesion_activa_id IS NULL THEN
        RETURN 'No hay sesión de caja abierta';
    END IF;

    -- Calcular total antes de vaciar
    SELECT COALESCE(SUM(cantidad * denominacion), 0) INTO total_vaciado
    FROM caja_denominaciones
    WHERE sesion_id = sesion_activa_id;

    -- Vaciar todas las denominaciones
    UPDATE caja_denominaciones
    SET cantidad = 0
    WHERE sesion_id = sesion_activa_id;

    RETURN 'Caja vaciada exitosamente. Total removido: $' || total_vaciado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Para usar la función:
-- SELECT vaciar_caja_actual();
