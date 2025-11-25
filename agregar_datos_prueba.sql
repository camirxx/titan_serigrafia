-- Script para agregar datos de prueba en Supabase
-- Ejecutar esto en el SQL Editor de Supabase

-- 1. Agregar una venta en efectivo de hoy
INSERT INTO public.ventas (
    id, 
    tienda_id, 
    vendedor_id, 
    total, 
    metodo_pago, 
    created_at, 
    updated_at
) VALUES (
    gen_random_uuid(), -- ID único
    1, -- tienda_id (ajusta si es diferente)
    1, -- vendedor_id (ajusta si es diferente)  
    25000, -- total de la venta
    'efectivo', -- método de pago
    NOW(), -- fecha y hora actual
    NOW()
);

-- 2. Agregar otra venta en efectivo
INSERT INTO public.ventas (
    id, 
    tienda_id, 
    vendedor_id, 
    total, 
    metodo_pago, 
    created_at, 
    updated_at
) VALUES (
    gen_random_uuid(),
    1,
    1,
    15000,
    'efectivo',
    NOW(),
    NOW()
);

-- 3. Agregar una venta con tarjeta (para probar diferencia)
INSERT INTO public.ventas (
    id, 
    tienda_id, 
    vendedor_id, 
    total, 
    metodo_pago, 
    created_at, 
    updated_at
) VALUES (
    gen_random_uuid(),
    1,
    1,
    30000,
    'tarjeta',
    NOW(),
    NOW()
);

-- 4. Agregar un ingreso manual a caja
INSERT INTO public.caja_movimientos (
    id,
    sesion_id, -- si no tienes sesiones, usa NULL o crea una sesión primero
    fecha,
    tipo,
    concepto,
    monto,
    created_at
) VALUES (
    gen_random_uuid(),
    NULL, -- o el ID de una sesión existente
    NOW(),
    'ingreso',
    'Ingreso manual de prueba',
    10000,
    NOW()
);

-- 5. Agregar un retiro de caja
INSERT INTO public.caja_movimientos (
    id,
    sesion_id,
    fecha,
    tipo,
    concepto,
    monto,
    created_at
) VALUES (
    gen_random_uuid(),
    NULL, -- o el ID de una sesión existente
    NOW(),
    'egreso',
    'Retiro de prueba',
    5000,
    NOW()
);

-- 6. Verificar los datos agregados
SELECT 'Ventas en efectivo de hoy:' as info, COUNT(*) as cantidad, SUM(total) as total
FROM public.ventas 
WHERE metodo_pago = 'efectivo' 
AND DATE(created_at) = CURRENT_DATE;

SELECT 'Ingresos manuales de hoy:' as info, COUNT(*) as cantidad, SUM(monto) as total
FROM public.caja_movimientos 
WHERE tipo = 'ingreso' 
AND DATE(created_at) = CURRENT_DATE;

SELECT 'Retiros de hoy:' as info, COUNT(*) as cantidad, SUM(monto) as total
FROM public.caja_movimientos 
WHERE tipo = 'egreso' 
AND DATE(created_at) = CURRENT_DATE;
