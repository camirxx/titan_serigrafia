begin;

-- 1) Helper: sesión abierta
create or replace function public.caja_sesion_abierta_id(p_tienda_id bigint)
returns bigint
language sql
stable
security definer
as $$
  select s.id
  from public.caja_sesiones s
  where s.tienda_id = p_tienda_id
    and s.abierta = true
  order by s.fecha_apertura desc
  limit 1
$$;

revoke all on function public.caja_sesion_abierta_id(bigint) from public;
grant execute on function public.caja_sesion_abierta_id(bigint) to authenticated;

-- 2) Único ingreso por venta en efectivo (evita duplicados)
create unique index if not exists caja_mov_ingreso_venta_uidx
  on public.caja_movimientos(venta_id)
  where tipo = 'ingreso';

-- 3) Trigger: ingreso a caja cuando total > 0 y pago = efectivo
create or replace function public.fn_caja_ingreso_por_venta()
returns trigger
language plpgsql
security definer
as $$
declare
  v_sesion_id bigint;
begin
  if NEW.metodo_pago <> 'efectivo' or NEW.total is null or NEW.total <= 0 then
    return NEW;
  end if;

  if exists (
    select 1 from public.caja_movimientos
    where venta_id = NEW.id and tipo = 'ingreso'
  ) then
    return NEW;
  end if;

  v_sesion_id := public.caja_sesion_abierta_id(NEW.tienda_id);

  if v_sesion_id is null then
    raise exception 'No hay sesión de caja abierta en tienda % para registrar el ingreso de la venta %',
      NEW.tienda_id, NEW.id;
  end if;

  insert into public.caja_movimientos (sesion_id, fecha, tipo, concepto, monto, venta_id, usuario_id)
  values (v_sesion_id, now(), 'ingreso', concat('venta ', NEW.id), NEW.total, NEW.id, NEW.vendedor_id);

  return NEW;
end;
$$;

drop trigger if exists trg_caja_ingreso_por_venta on public.ventas;

create trigger trg_caja_ingreso_por_venta
after update of total on public.ventas
for each row
when (NEW.total is not null and NEW.total > 0)
execute function public.fn_caja_ingreso_por_venta();

commit;
