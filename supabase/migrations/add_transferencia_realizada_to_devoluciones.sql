-- Agregar columnas para datos de transferencia bancaria
ALTER TABLE devoluciones 
ADD COLUMN IF NOT EXISTS metodo_pago_reintegro VARCHAR(50),
ADD COLUMN IF NOT EXISTS transferencia_rut VARCHAR(20),
ADD COLUMN IF NOT EXISTS transferencia_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS transferencia_banco VARCHAR(100),
ADD COLUMN IF NOT EXISTS transferencia_tipo_cuenta VARCHAR(50),
ADD COLUMN IF NOT EXISTS transferencia_numero_cuenta VARCHAR(50),
ADD COLUMN IF NOT EXISTS transferencia_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS transferencia_realizada BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_transferencia TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tipo_diferencia VARCHAR(50),
ADD COLUMN IF NOT EXISTS monto_diferencia NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS metodo_pago_diferencia VARCHAR(50);

-- Agregar comentarios
COMMENT ON COLUMN devoluciones.metodo_pago_reintegro IS 'Método de pago para reintegro: efectivo o transferencia';
COMMENT ON COLUMN devoluciones.transferencia_rut IS 'RUT del cliente para transferencia bancaria';
COMMENT ON COLUMN devoluciones.transferencia_nombre IS 'Nombre completo del cliente para transferencia';
COMMENT ON COLUMN devoluciones.transferencia_banco IS 'Banco del cliente';
COMMENT ON COLUMN devoluciones.transferencia_tipo_cuenta IS 'Tipo de cuenta: corriente, vista, ahorro';
COMMENT ON COLUMN devoluciones.transferencia_numero_cuenta IS 'Número de cuenta bancaria';
COMMENT ON COLUMN devoluciones.transferencia_email IS 'Email del cliente (opcional)';
COMMENT ON COLUMN devoluciones.transferencia_realizada IS 'Indica si la transferencia bancaria fue realizada';
COMMENT ON COLUMN devoluciones.fecha_transferencia IS 'Fecha en que se realizó la transferencia bancaria';
COMMENT ON COLUMN devoluciones.tipo_diferencia IS 'Tipo de diferencia en cambios: sin_diferencia, cliente_paga, cliente_recibe';
COMMENT ON COLUMN devoluciones.monto_diferencia IS 'Monto de la diferencia en cambios';
COMMENT ON COLUMN devoluciones.metodo_pago_diferencia IS 'Método de pago para diferencia: efectivo o transferencia';

-- Crear índice para búsquedas rápidas de transferencias pendientes
CREATE INDEX IF NOT EXISTS idx_devoluciones_transferencia_pendiente 
ON devoluciones(transferencia_realizada) 
WHERE transferencia_realizada = FALSE;
