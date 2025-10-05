create or replace function public.fn_devoluciones_ai_caja()
returns trigger
language plpgsql
as $$
begin
  if NEW.metodo_resolucion = 'reintegro_efectivo' and NEW.monto_reintegro > 0 then
    insert into public.caja_movimientos (tipo, monto, concepto, created_at)
    values ('egreso', NEW.monto_reintegro, concat('Reintegro devolución #', NEW.id), now());
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_devoluciones_ai_caja on public.devoluciones;

create trigger trg_devoluciones_ai_caja
after insert on public.devoluciones
for each row
execute procedure public.fn_devoluciones_ai_caja();
