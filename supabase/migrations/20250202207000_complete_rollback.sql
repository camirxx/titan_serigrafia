begin;

-- Eliminar TODAS las funciones RPC de caja que existen
drop function if exists public.caja_agregar_denominaciones cascade;
drop function if exists public.caja_retirar_denominaciones cascade;
drop function if exists public.caja_ingresar_denominaciones cascade;
drop function if exists public.caja_obtener_denominaciones cascade;
drop function if exists public.caja_retirar_denominaciones_simple cascade;

commit;
