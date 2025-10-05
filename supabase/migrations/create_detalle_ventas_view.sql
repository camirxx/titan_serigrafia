create or replace view public.detalle_ventas_view as
select
  dv.id,
  dv.venta_id,
  dv.variante_id,
  p.nombre as producto_nombre,
  coalesce(v.nombre, concat('Variante ', dv.variante_id)) as variante_nombre,
  dv.cantidad,
  dv.precio_unitario
from public.detalle_ventas dv
join public.variantes v on v.id = dv.variante_id
join public.productos p on p.id = v.producto_id;
