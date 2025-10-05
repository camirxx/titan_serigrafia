-- Vista base de movimientos con entradas/salidas normalizadas
create or replace view public.kardex_movimientos as
select
  mi.id,
  mi.variante_id,
  mi.created_at,
  mi.tipo,
  mi.referencia,
  case 
    when mi.tipo in ('devolucion','compra','ajuste_ingreso') then mi.cantidad
    else 0
  end as entrada,
  case
    when mi.tipo in ('venta','cambio_entrega','ajuste_salida') then mi.cantidad
    else 0
  end as salida
from public.movimientos_inventario mi;

-- Saldos acumulados por variante (orden temporal)
create or replace view public.kardex_view as
select
  km.variante_id,
  v.producto_id,
  p.nombre as producto_nombre,
  coalesce(v.nombre, concat('Variante ', v.id)) as variante_nombre,
  km.id as movimiento_id,
  km.created_at as fecha,
  km.tipo,
  km.referencia,
  km.entrada,
  km.salida,
  (sum(km.entrada - km.salida) over (partition by km.variante_id order by km.created_at, km.id
     rows between unbounded preceding and current row))::int as saldo
from public.kardex_movimientos km
join public.variantes v on v.id = km.variante_id
join public.productos p on p.id = v.producto_id
order by km.variante_id, km.created_at, km.id;
