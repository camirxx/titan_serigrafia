// Utilidades para exportar datos a CSV y Excel

/**
 * Convierte un array de objetos a CSV
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  // Obtener headers de las claves del primer objeto
  const headers = Object.keys(data[0]);
  
  // Crear filas CSV
  const csvRows = [];
  
  // Agregar headers
  csvRows.push(headers.join(','));
  
  // Agregar datos
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escapar comillas y comas
      const escaped = ('' + value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  // Crear blob y descargar
  const csvString = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convierte un array de objetos a Excel
 * Requiere: npm install xlsx
 */
export async function exportToExcel(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  try {
    // Importar xlsx dinámicamente (solo en el cliente)
    const XLSX = await import('xlsx');
    
    // Crear worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar ancho de columnas automáticamente
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      )
    }));
    ws['!cols'] = colWidths;
    
    // Crear workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    
    // Descargar
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    // Fallback a CSV si hay error
    console.warn('Exportando como CSV en su lugar');
    exportToCSV(data, filename);
  }
}

/**
 * Formatea datos para exportación (limpia y prepara)
 */
export function prepareDataForExport(data: Record<string, unknown>[], columnsMap?: Record<string, string | undefined>) {
  if (!data || data.length === 0) return [];
  
  return data.map(row => {
    const newRow: Record<string, unknown> = {};
    
    // Si hay columnsMap, solo incluir las columnas especificadas
    if (columnsMap) {
      for (const [originalKey, newKey] of Object.entries(columnsMap)) {
        if (newKey && row.hasOwnProperty(originalKey)) {
          const value = row[originalKey];
          
          // Formatear valores
          if (value === null || value === undefined) {
            newRow[newKey] = '';
          } else if (typeof value === 'number') {
            newRow[newKey] = value;
          } else if (value instanceof Date) {
            newRow[newKey] = value.toLocaleDateString('es-CL');
          } else {
            newRow[newKey] = value;
          }
        }
      }
    } else {
      // Sin columnsMap, incluir todas las columnas
      for (const [key, value] of Object.entries(row)) {
        if (value === null || value === undefined) {
          newRow[key] = '';
        } else if (typeof value === 'number') {
          newRow[key] = value;
        } else if (value instanceof Date) {
          newRow[key] = value.toLocaleDateString('es-CL');
        } else {
          newRow[key] = value;
        }
      }
    }
    
    return newRow;
  });
}
