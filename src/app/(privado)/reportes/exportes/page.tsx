'use client';

export default function ExportesPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4 bg-white">
      <h1 className="text-2xl font-bold">📊 Reportes y Exportación</h1>
      <p className="text-sm text-gray-600">Descarga resúmenes en CSV/Excel.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <a href="/api/export/ventas" className="rounded border p-4 hover:bg-gray-50">Exportar Ventas (CSV)</a>
        <a href="/api/export/stock" className="rounded border p-4 hover:bg-gray-50">Exportar Stock (CSV)</a>
      </div>
    </div>
  );
}

