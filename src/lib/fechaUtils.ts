/**
 * Utilidades para manejo de fechas con zona horaria de Chile
 */

/**
 * Obtiene la fecha y hora actual en zona horaria de Chile (Santiago, America/Santiago)
 * @returns Date object con la hora correcta de Chile
 */
export const obtenerFechaChile = (): Date => {
  const ahora = new Date();
  // Chile está en UTC-3 (horario de verano) o UTC-4 (horario estándar)
  // Usamos Intl para obtener la fecha correcta según la zona horaria
  const opciones: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formato = new Intl.DateTimeFormat('es-CL', opciones);
  const partes = formato.formatToParts(ahora);
  
  const valores: Record<string, string> = {};
  partes.forEach(parte => {
    valores[parte.type] = parte.value;
  });
  
  // Crear nueva fecha con los valores de la zona horaria de Chile
  return new Date(
    `${valores.year}-${valores.month}-${valores.day}T${valores.hour}:${valores.minute}:${valores.second}`
  );
};

/**
 * Formatea una fecha para mostrar en formato chileno
 * @param fecha - Date object o string
 * @param options - Opciones de formateo
 * @returns string con la fecha formateada
 */
export const formatearFechaChile = (
  fecha: Date | string, 
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  const opcionesPorDefecto: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return date.toLocaleDateString('es-CL', opcionesPorDefecto);
};

/**
 * Formatea una hora para mostrar en formato chileno
 * @param fecha - Date object o string
 * @param options - Opciones de formateo
 * @returns string con la hora formateada
 */
export const formatearHoraChile = (
  fecha: Date | string, 
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  const opcionesPorDefecto: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options
  };
  
  return date.toLocaleTimeString('es-CL', opcionesPorDefecto);
};

/**
 * Formatea fecha y hora completas para mostrar en formato chileno
 * @param fecha - Date object o string
 * @param options - Opciones de formateo
 * @returns string con fecha y hora formateadas
 */
export const formatearFechaHoraChile = (
  fecha: Date | string, 
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  const opcionesPorDefecto: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options
  };
  
  return date.toLocaleString('es-CL', opcionesPorDefecto);
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD para la base de datos
 * @returns string con la fecha en formato ISO
 */
export const obtenerFechaISOChile = (): string => {
  const fechaChile = obtenerFechaChile();
  return fechaChile.toISOString().split('T')[0];
};
