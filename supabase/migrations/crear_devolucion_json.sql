const payload = {
  venta_id: 123,
  tipo: 'devolucion',
  metodo_resolucion: 'reintegro_efectivo',
  monto_reintegro: 5000,
  observacion: 'Cliente devolvió producto',
  usuario_id: user.id,
  items_devueltos: [
    { detalle_venta_id: 456, variante_id: 10, cantidad: 1, motivo_codigo: 'TALLA' }
  ]
};

const { data, error } = await supabase.rpc('crear_devolucion_json', { p: payload });
