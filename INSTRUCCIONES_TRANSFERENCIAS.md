# Instrucciones para Completar la Funcionalidad de Transferencias

## Resumen
Se ha implementado un sistema completo para gestionar transferencias bancarias en devoluciones:
1. ✅ Envío automático de correo electrónico cuando se registra una transferencia
2. ✅ Migraciones SQL para agregar columnas de seguimiento
3. ✅ Función RPC para marcar transferencias como realizadas
4. ⚠️ Falta actualizar el reporte de devoluciones (archivo corrupto, necesita corrección manual)

## Archivos Creados

### 1. API de Envío de Correos
**Archivo:** `src/app/api/send-transfer-email/route.ts`
- ✅ Creado y funcional
- Envía correos a `dylanwtf16@gmail.com` con datos de transferencia
- Usa Resend API (necesita configurar `RESEND_API_KEY` en `.env`)

### 2. Migraciones SQL
**Archivos creados:**
- `supabase/migrations/add_transferencia_realizada_to_devoluciones.sql`
- `supabase/migrations/update_reporte_devoluciones_view_with_transfer.sql`
- `supabase/migrations/create_marcar_transferencia_realizada_function.sql`

**Ejecutar en Supabase:**
```bash
# Aplicar las migraciones
supabase db push
```

### 3. DevolucionesClient.tsx
**Archivo:** `src/app/(privado)/devoluciones/DevolucionesClient.tsx`
- ✅ Modificado correctamente
- Envía correo automáticamente cuando se registra una transferencia
- Muestra mensaje de confirmación al usuario

## Cambios Pendientes en el Reporte

### Archivo: `src/app/(privado)/reportes/devoluciones/page.tsx`

#### Paso 1: Actualizar el tipo `Devolucion` (línea 10-27)
Agregar los siguientes campos al tipo:
```typescript
type Devolucion = {
  devolucion_id: number;
  fecha_devolucion: string;
  tipo: string;
  metodo_resolucion: string;
  monto_reintegro: number;
  observacion: string | null;
  venta_id: number;
  fecha_venta_original: string;
  total_venta_original: number;
  metodo_pago_venta: string;
  numero_boleta: string | null;
  usuario_nombre: string;
  tienda_nombre: string;
  cantidad_items: number;
  total_unidades_devueltas: number;
  monto_total_devuelto: number;
  // NUEVOS CAMPOS:
  metodo_pago_reintegro: string | null;
  transferencia_rut: string | null;
  transferencia_nombre: string | null;
  transferencia_banco: string | null;
  transferencia_tipo_cuenta: string | null;
  transferencia_numero_cuenta: string | null;
  transferencia_email: string | null;
  transferencia_realizada: boolean | null;
  fecha_transferencia: string | null;
  tipo_diferencia: string | null;
  monto_diferencia: number | null;
  metodo_pago_diferencia: string | null;
};
```

#### Paso 2: Actualizar estados (línea 59)
Cambiar:
```typescript
const [vistaActual, setVistaActual] = useState<'resumen' | 'detalle'>('resumen');
```

Por:
```typescript
const [vistaActual, setVistaActual] = useState<'resumen' | 'detalle' | 'transferencias'>('resumen');
const [actualizando, setActualizando] = useState<number | null>(null);
```

#### Paso 3: Agregar función para marcar transferencias (después de la función `downloadCSV`)
```typescript
// Función para marcar transferencia como realizada
const marcarTransferencia = async (devolucionId: number, realizada: boolean) => {
  setActualizando(devolucionId);
  try {
    const { error } = await supabase.rpc('marcar_transferencia_realizada', {
      p_devolucion_id: devolucionId,
      p_realizada: realizada,
    });

    if (error) throw error;

    // Actualizar el estado local
    setDevoluciones((prev) =>
      prev.map((d) =>
        d.devolucion_id === devolucionId
          ? { ...d, transferencia_realizada: realizada, fecha_transferencia: realizada ? new Date().toISOString() : null }
          : d
      )
    );
  } catch (error) {
    console.error('Error al marcar transferencia:', error);
    setErrorMsg('Error al actualizar el estado de la transferencia');
  } finally {
    setActualizando(null);
  }
};

// Filtrar devoluciones con transferencia
const devolucionesConTransferencia = devoluciones.filter((d) => {
  const esTransferencia = (d.metodo_pago_reintegro === 'transferencia') ||
                         (d.tipo_diferencia === 'cliente_recibe' && d.metodo_pago_diferencia === 'transferencia');
  return esTransferencia && d.transferencia_rut;
});

const transferenciasPendientes = devolucionesConTransferencia.filter((d) => !d.transferencia_realizada);
const transferenciasRealizadas = devolucionesConTransferencia.filter((d) => d.transferencia_realizada);
```

#### Paso 4: Actualizar el toggle de vistas
Buscar el código del toggle (alrededor de la línea 463) y agregar el botón de transferencias:
```typescript
<button
  onClick={() => setVistaActual('transferencias')}
  className={`px-6 py-2 font-medium transition-colors relative ${
    vistaActual === 'transferencias' 
      ? 'bg-purple-600 text-white' 
      : 'bg-white text-gray-700 hover:bg-gray-50'
  }`}
>
  🏦 Transferencias
  {transferenciasPendientes.length > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {transferenciasPendientes.length}
    </span>
  )}
</button>
```

#### Paso 5: Agregar la vista de transferencias
Agregar antes del cierre del componente (antes del último `</div>`):

```typescript
{/* Tabla Transferencias */}
{vistaActual === 'transferencias' && (
  <div className="space-y-6">
    {/* Transferencias Pendientes */}
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          ⏳ Transferencias Pendientes
          <span className="bg-white text-red-600 text-sm font-bold px-2 py-1 rounded-full">
            {transferenciasPendientes.length}
          </span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Banco</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cuenta</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transferenciasPendientes.map((d) => (
              <tr key={d.devolucion_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  #{d.devolucion_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(d.fecha_devolucion).toLocaleDateString('es-CL')}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium text-gray-900">{d.transferencia_nombre}</div>
                  <div className="text-xs text-gray-500">RUT: {d.transferencia_rut}</div>
                  {d.transferencia_email && (
                    <div className="text-xs text-gray-500">📧 {d.transferencia_email}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium text-gray-900">{d.transferencia_banco}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {d.transferencia_tipo_cuenta?.replace('_', ' ')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  {d.transferencia_numero_cuenta}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                  ${(d.monto_reintegro || d.monto_diferencia || 0).toLocaleString('es-CL')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => marcarTransferencia(d.devolucion_id, true)}
                    disabled={actualizando === d.devolucion_id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actualizando === d.devolucion_id ? (
                      <>⏳ Procesando...</>
                    ) : (
                      <>✓ Marcar como Transferido</>
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {transferenciasPendientes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="text-gray-400 text-4xl mb-2">✅</div>
                  <p className="text-gray-500 font-medium">No hay transferencias pendientes</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Todas las transferencias han sido realizadas
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Transferencias Realizadas */}
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          ✅ Transferencias Realizadas
          <span className="bg-white text-green-600 text-sm font-bold px-2 py-1 rounded-full">
            {transferenciasRealizadas.length}
          </span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha Dev.</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Banco</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha Transf.</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transferenciasRealizadas.map((d) => (
              <tr key={d.devolucion_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  #{d.devolucion_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(d.fecha_devolucion).toLocaleDateString('es-CL')}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium text-gray-900">{d.transferencia_nombre}</div>
                  <div className="text-xs text-gray-500">RUT: {d.transferencia_rut}</div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium text-gray-900">{d.transferencia_banco}</div>
                  <div className="text-xs text-gray-500">{d.transferencia_numero_cuenta}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                  ${(d.monto_reintegro || d.monto_diferencia || 0).toLocaleString('es-CL')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {d.fecha_transferencia ? new Date(d.fecha_transferencia).toLocaleDateString('es-CL') : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => marcarTransferencia(d.devolucion_id, false)}
                    disabled={actualizando === d.devolucion_id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actualizando === d.devolucion_id ? (
                      <>⏳ Procesando...</>
                    ) : (
                      <>↩️ Marcar como Pendiente</>
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {transferenciasRealizadas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="text-gray-400 text-4xl mb-2">📋</div>
                  <p className="text-gray-500 font-medium">No hay transferencias realizadas</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
```

## Configuración Requerida

### 1. Variables de Entorno
Agregar a `.env.local`:
```
RESEND_API_KEY=tu_api_key_de_resend
```

### 2. Configurar Resend
1. Crear cuenta en https://resend.com
2. Verificar dominio o usar dominio de prueba
3. Obtener API Key
4. Configurar el remitente en el archivo `route.ts` si es necesario

### 3. Aplicar Migraciones SQL
```bash
cd supabase
supabase db push
```

## Pruebas

1. **Registrar una devolución con transferencia:**
   - Ir a Devoluciones
   - Seleccionar productos
   - Elegir "Reintegro en Efectivo" > "Transferencia"
   - Llenar datos bancarios del cliente
   - Confirmar operación
   - Verificar que llegue el correo a `dylanwtf16@gmail.com`

2. **Ver transferencias pendientes:**
   - Ir a Reportes > Devoluciones
   - Click en pestaña "🏦 Transferencias"
   - Ver lista de transferencias pendientes

3. **Marcar como transferido:**
   - En la lista de pendientes, click en "✓ Marcar como Transferido"
   - Verificar que se mueva a la lista de realizadas

## Notas Importantes

- El correo se envía de forma asíncrona y no bloquea la operación
- Si falla el envío del correo, la devolución se registra igual
- Los datos de transferencia se guardan en la tabla `devoluciones`
- La vista actualizada incluye todos los campos necesarios
