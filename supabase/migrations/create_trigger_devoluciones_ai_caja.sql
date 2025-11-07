create or replace function public.fn_devoluciones_ai_caja()
returns trigger
language plpgsql
as $$
declare
  usuario_nombre text := 'Sistema';
begin
  if NEW.metodo_resolucion = 'reintegro_efectivo' and NEW.monto_reintegro > 0 then
    -- Registrar el egreso en caja
    insert into public.caja_movimientos (tipo, monto, concepto, created_at)
    values ('egreso', NEW.monto_reintegro, concat('Reintegro devolución #', NEW.id), now());

    -- Obtener nombre del usuario que procesó la devolución
    select u.nombre into usuario_nombre
    from usuarios u
    where u.id = NEW.usuario_id;

    -- Enviar email de notificación (usando pg_net si está disponible)
    -- Nota: Esto requiere configuración adicional en Supabase
    -- Por ahora, el email se enviará desde el frontend cuando se procese la devolución

    raise notice 'Egreso registrado: % por devolución #% para usuario %', NEW.monto_reintegro, NEW.id, usuario_nombre;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_devoluciones_ai_caja on public.devoluciones;

create trigger trg_devoluciones_ai_caja
after insert on public.devoluciones
for each row
execute procedure public.fn_devoluciones_ai_caja();
