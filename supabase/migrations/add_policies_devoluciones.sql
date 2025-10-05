-- === Policies para TABLAS que usan las vistas ===
-- (detalle_ventas_view usa: detalle_ventas, variantes, productos)
-- (tu formulario también lee ventas)

-- Habilitar RLS (si aún no estaba habilitado)
alter table public.detalle_ventas enable row level security;
alter table public.variantes       enable row level security;
alter table public.productos       enable row level security;
alter table public.ventas          enable row level security;

-- SELECT mínimo para usuarios autenticados (MVP)
create policy "read_detalle_ventas"
on public.detalle_ventas
for select
using (auth.uid() is not null);

create policy "read_variantes"
on public.variantes
for select
using (auth.uid() is not null);

create policy "read_productos"
on public.productos
for select
using (auth.uid() is not null);

create policy "read_ventas"
on public.ventas
for select
using (auth.uid() is not null);
