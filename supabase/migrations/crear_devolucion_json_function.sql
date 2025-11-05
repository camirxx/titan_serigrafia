-- Eliminar cualquier función existente con este nombre
DROP FUNCTION IF EXISTS crear_devolucion_json CASCADE;

-- Función para crear una devolución con todos los datos necesarios
CREATE OR REPLACE FUNCTION crear_devolucion_json(
    p_venta_id INTEGER,
    p_tipo VARCHAR(50),
    p_metodo_resolucion VARCHAR(50),
    p_usuario_id UUID,
    p_items JSONB,
    p_monto_reintegro NUMERIC DEFAULT 0,
    p_observacion TEXT DEFAULT NULL,
    -- Parámetros opcionales para transferencias
    p_metodo_pago_reintegro VARCHAR(50) DEFAULT NULL,
    p_transferencia_rut VARCHAR(20) DEFAULT NULL,
    p_transferencia_nombre VARCHAR(255) DEFAULT NULL,
    p_transferencia_banco VARCHAR(100) DEFAULT NULL,
    p_transferencia_tipo_cuenta VARCHAR(50) DEFAULT NULL,
    p_transferencia_numero_cuenta VARCHAR(50) DEFAULT NULL,
    p_transferencia_email VARCHAR(255) DEFAULT NULL,
    -- Parámetros para cambios con diferencia
    p_tipo_diferencia VARCHAR(50) DEFAULT NULL,
    p_monto_diferencia NUMERIC DEFAULT 0,
    p_metodo_pago_diferencia VARCHAR(50) DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_devolucion_id INTEGER;
    v_item JSONB;
    v_detalle_venta_id INTEGER;
    v_variante_id INTEGER;
    v_cantidad INTEGER;
BEGIN
    -- Insertar la devolución principal
    INSERT INTO devoluciones (
        venta_id,
        tipo,
        metodo_resolucion,
        monto_reintegro,
        observacion,
        usuario_id,
        metodo_pago_reintegro,
        transferencia_rut,
        transferencia_nombre,
        transferencia_banco,
        transferencia_tipo_cuenta,
        transferencia_numero_cuenta,
        transferencia_email,
        tipo_diferencia,
        monto_diferencia,
        metodo_pago_diferencia,
        transferencia_realizada
    ) VALUES (
        p_venta_id,
        p_tipo,
        p_metodo_resolucion,
        p_monto_reintegro,
        p_observacion,
        p_usuario_id,
        p_metodo_pago_reintegro,
        p_transferencia_rut,
        p_transferencia_nombre,
        p_transferencia_banco,
        p_transferencia_tipo_cuenta,
        p_transferencia_numero_cuenta,
        p_transferencia_email,
        p_tipo_diferencia,
        p_monto_diferencia,
        p_metodo_pago_diferencia,
        FALSE  -- Por defecto no realizada
    ) RETURNING id INTO v_devolucion_id;

    -- Insertar los items de la devolución
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_detalle_venta_id := (v_item->>'detalle_venta_id')::INTEGER;
        v_variante_id := (v_item->>'variante_id')::INTEGER;
        v_cantidad := (v_item->>'cantidad')::INTEGER;

        INSERT INTO devoluciones_items (
            devolucion_id,
            detalle_venta_id,
            variante_id,
            cantidad
        ) VALUES (
            v_devolucion_id,
            v_detalle_venta_id,
            v_variante_id,
            v_cantidad
        );
    END LOOP;

    -- Si es un cambio con productos entregados, crear entrada en cambios_items_entregados
    -- (Esta lógica se puede expandir según sea necesario)

    RETURN v_devolucion_id;
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION crear_devolucion_json(
    INTEGER, VARCHAR, VARCHAR, UUID, JSONB,
    NUMERIC, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR,
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, VARCHAR
) TO authenticated;

-- Agregar comentario
COMMENT ON FUNCTION crear_devolucion_json IS 'Crea una devolución completa con todos los datos necesarios incluyendo transferencias';
