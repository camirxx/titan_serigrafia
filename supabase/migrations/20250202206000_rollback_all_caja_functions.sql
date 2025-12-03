begin;

-- Eliminar todas las funciones RPC que hemos creado
drop function if exists public.caja_retirar_denominaciones(bigint, jsonb, text) cascade;
drop function if exists public.caja_retirar_denominaciones_simple(bigint, jsonb, text) cascade;
drop function if exists public.caja_ingresar_denominaciones(bigint, jsonb, text) cascade;
drop function if exists public.caja_agregar_denominaciones(bigint, jsonb, text) cascade;

commit;
