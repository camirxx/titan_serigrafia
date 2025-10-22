-- Función para marcar una devolución como transferida
CREATE OR REPLACE FUNCTION marcar_transferencia_realizada(
    p_devolucion_id INTEGER,
    p_realizada BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Actualizar el estado de la transferencia
    UPDATE devoluciones
    SET 
        transferencia_realizada = p_realizada,
        fecha_transferencia = CASE 
            WHEN p_realizada THEN NOW() 
            ELSE NULL 
        END
    WHERE id = p_devolucion_id;
    
    -- Verificar si se actualizó algún registro
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró la devolución con ID %', p_devolucion_id;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION marcar_transferencia_realizada(INTEGER, BOOLEAN) TO authenticated;

-- Agregar comentario
COMMENT ON FUNCTION marcar_transferencia_realizada IS 'Marca una devolución como transferida o pendiente de transferencia';
