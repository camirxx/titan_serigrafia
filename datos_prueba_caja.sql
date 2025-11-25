-- Script para agregar datos de prueba a caja_movimientos
-- Ejecutar en Supabase SQL Editor

-- Primero verificar si hay sesiones de caja abiertas
SELECT 'Sesiones de caja abiertas:' as info, id, fecha_apertura 
FROM caja_sesiones 
WHERE abierta = true;

-- Si no hay sesiones, crear una sesión de prueba
INSERT INTO caja_sesiones (
    tienda_id,
    fecha_apertura,
    abierta,
    saldo_inicial
) 
SELECT 
    1, -- tienda_id por defecto
    NOW(),
    true,
    0
WHERE NOT EXISTS (
    SELECT 1 FROM caja_sesiones 
    WHERE abierta = true
);

-- Obtener el ID de la sesión abierta
DO $$
DECLARE
    sesion_id_var BIGINT;
BEGIN
    SELECT id INTO sesion_id_var 
    FROM caja_sesiones 
    WHERE abierta = true 
    LIMIT 1;
    
    IF sesion_id_var IS NOT NULL THEN
        -- 1. Agregar un ingreso manual de hoy
        INSERT INTO public.caja_movimientos (
            sesion_id,
            fecha,
            tipo,
            concepto,
            monto,
            usuario_id
        ) VALUES (
            sesion_id_var,
            NOW(),
            'ingreso',
            'Ingreso manual de prueba - pago cliente',
            15000,
            NULL
        );

        -- 2. Agregar un retiro manual de hoy (simulando el retiro de 5000 que mencionaste)
        INSERT INTO public.caja_movimientos (
            sesion_id,
            fecha,
            tipo,
            concepto,
            monto,
            usuario_id
        ) VALUES (
            sesion_id_var,
            NOW() - INTERVAL '2 hours', -- Simular que fue hace 2 horas (19:19 si son las 21:19)
            'egreso',
            'Retiro de efectivo - compra insumos',
            5000,
            NULL
        );

        -- 3. Agregar otro retiro más reciente
        INSERT INTO public.caja_movimientos (
            sesion_id,
            fecha,
            tipo,
            concepto,
            monto,
            usuario_id
        ) VALUES (
            sesion_id_var,
            NOW() - INTERVAL '1 hour',
            'egreso',
            'Retiro para gastos varios',
            2000,
            NULL
        );

        -- 4. Agregar un ingreso manual más reciente
        INSERT INTO public.caja_movimientos (
            sesion_id,
            fecha,
            tipo,
            concepto,
            monto,
            usuario_id
        ) VALUES (
            sesion_id_var,
            NOW() - INTERVAL '30 minutes',
            'ingreso',
            'Arriendo local',
            25000,
            NULL
        );
        
        RAISE NOTICE 'Datos de prueba agregados exitosamente con sesión ID: %', sesion_id_var;
    ELSE
        RAISE NOTICE 'No se encontró sesión de caja abierta';
    END IF;
END $$;

-- Verificar los datos insertados
SELECT 
    id,
    sesion_id,
    tipo,
    monto,
    concepto,
    fecha,
    DATE(fecha) as fecha_solo_fecha
FROM public.caja_movimientos 
WHERE DATE(fecha) = CURRENT_DATE
ORDER BY fecha DESC;
