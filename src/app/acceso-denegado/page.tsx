import Link from "next/link";

export default function AccesoDenegado() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Acceso denegado</h1>
        <p className="text-gray-600">
          No tienes permisos para acceder a esta sección.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded border"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
