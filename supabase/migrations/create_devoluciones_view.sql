create or replace view public.devoluciones_view as
select d.id, d.venta_id, d.tipo, d.metodo_resolucion, d.monto_reintegro,
       d.observacion, d.usuario_id, d.created_at,
       (
         select coalesce(json_agg(row_to_json(di)), '[]'::json)
         from public.devoluciones_items di
         where di.devolucion_id = d.id
       ) as items_devueltos,
       (
         select coalesce(json_agg(row_to_json(ci)), '[]'::json)
         from public.cambios_items_entregados ci
         where ci.devolucion_id = d.id
       ) as items_cambio
from public.devoluciones d
order by d.created_at desc;
