import Link from "next/link";

export default function AccesoRestringido() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Acceso restringido</h1>
        <p className="text-gray-600">
          Debes iniciar sesión para ver esta página.
        </p>
        <Link
          href="/login"
          className="inline-block px-4 py-2 rounded bg-black text-white"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
