'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, FileDown } from 'lucide-react';

interface ReportHeaderProps {
  title: string;
  icon: React.ReactNode;
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  showExport?: boolean;
}

export default function ReportHeader({ 
  title, 
  icon, 
  onExportCSV, 
  onExportExcel,
  showExport = true 
}: ReportHeaderProps) {
  const router = useRouter();
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setFecha(now.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }));
      setHora(now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-6 text-white mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
            <p className="text-white/80 text-sm mt-1">
              {fecha} · {hora}
            </p>
          </div>
        </div>

        {showExport && (onExportCSV || onExportExcel) && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition font-semibold"
            >
              <FileDown className="w-5 h-5" />
              Exportar
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl overflow-hidden z-10">
                {onExportCSV && (
                  <button
                    onClick={() => {
                      onExportCSV();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 transition flex items-center gap-2"
                  >
                    <span className="text-lg">📄</span>
                    <span className="font-medium">Exportar CSV</span>
                  </button>
                )}
                {onExportExcel && (
                  <button
                    onClick={() => {
                      onExportExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-green-50 transition flex items-center gap-2"
                  >
                    <span className="text-lg">📊</span>
                    <span className="font-medium">Exportar Excel</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
