-- Script para vaciar completamente la caja actual
-- Ejecutar en Supabase SQL Editor

-- 1. Primero obtener la sesión de caja activa
SELECT * FROM caja_sesiones WHERE estado_sesion = 'abierta' LIMIT 1;

-- 2. Vaciar todas las denominaciones de la sesión activa
-- (Reemplaza SESION_ID con el ID de la sesión activa que obtuviste arriba)
UPDATE caja_denominaciones
SET cantidad = 0
WHERE sesion_id = 'SESION_ID_AQUI';

-- O si quieres vaciar todas las sesiones abiertas:
UPDATE caja_denominaciones
SET cantidad = 0
FROM caja_sesiones cs
WHERE caja_denominaciones.sesion_id = cs.id
AND cs.estado_sesion = 'abierta';

-- 3. Verificar que se vació correctamente
SELECT
  cs.id as sesion_id,
  cs.fecha_apertura,
  SUM(cd.cantidad * cd.denominacion) as total_caja
FROM caja_sesiones cs
LEFT JOIN caja_denominaciones cd ON cs.id = cd.sesion_id
WHERE cs.estado_sesion = 'abierta'
GROUP BY cs.id, cs.fecha_apertura;
