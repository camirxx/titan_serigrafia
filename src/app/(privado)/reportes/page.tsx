export default function Page() {
  return (
    <div className="space-y-2">
      <h1 className="text-lg font-semibold">Reportes</h1>
      <ul className="list-disc pl-5">
        <li><a href="/reportes/kardex" className="underline">Kardex</a></li>
        <li><a href="/reportes/ventas-diarias" className="underline">Ventas diarias</a></li>
      </ul>
    </div>
  );
}
