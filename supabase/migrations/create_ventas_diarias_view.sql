-- Ajusta columnas según tu 'ventas' (ej: tienda_id si existe)
create or replace view public.ventas_diarias_view as
select
  date_trunc('day', v.created_at) as fecha,
  -- v.tienda_id, -- descomenta si manejas multitienda
  count(*) as num_ventas,
  sum(v.total)::numeric as total_vendido
from public.ventas v
group by 1
order by 1 desc;
