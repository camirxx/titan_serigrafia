'use client';

import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';

interface Producto {
  diseno: string;
  tipo_prenda: string;
  color: string;
  tallas: Map<string, number>;
  stock_actual: number;
}

interface ModalEnviarMensajeProps {
  isOpen: boolean;
  onClose: () => void;
  productos: Producto[];
  correoTaller: string;
  umbralActual: number;
  onSend?: (data: { to: string; subject: string; message: string; includeExcel: boolean }) => Promise<void>;
  defaultEmail?: string;
  defaultSubject?: string;
  defaultMessage?: string;
}

export default function ModalEnviarMensaje({
  isOpen,
  onClose,
  productos,
  correoTaller,
  umbralActual,
  onSend,
  defaultEmail = correoTaller,
  defaultSubject = `Alerta de Stock Crítico - ${productos.length} productos`,
  defaultMessage = `Se detectaron ${productos.length} productos con stock crítico (≤ ${umbralActual})`
}: ModalEnviarMensajeProps) {
  const [email, setEmail] = useState(defaultEmail || correoTaller);
  const [subject, setSubject] = useState(defaultSubject || `Alerta de Stock Crítico - ${productos.length} productos`);
  const [message, setMessage] = useState(defaultMessage || `Se detectaron ${productos.length} productos con stock crítico (≤ ${umbralActual})`);
  const [includeExcel, setIncludeExcel] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor ingresa un correo electrónico');
      return;
    }

    try {
      setIsSending(true);
      
      // If onSend is provided, use it, otherwise use default implementation
      if (onSend) {
        await onSend({
          to: email,
          subject,
          message: message || `Se detectaron ${productos.length} productos con stock crítico (≤ ${umbralActual})`,
          includeExcel
        });
      } else {
        // Default implementation or API call
        const response = await fetch('/api/enviar-correo-stock-bajo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            subject: subject || `Alerta de Stock Crítico - ${productos.length} productos`,
            message: message || `Se detectaron ${productos.length} productos con stock crítico (≤ ${umbralActual})`,
            includeExcel,
            productos,
            umbral: umbralActual
          }),
        });

        if (!response.ok) {
          throw new Error('Error al enviar el correo');
        }
      }
      
      // Reset form after successful send
      setEmail(correoTaller);
      setSubject(`Alerta de Stock Crítico - ${productos.length} productos`);
      setMessage(`Se detectaron ${productos.length} productos con stock crítico (≤ ${umbralActual})`);
      setIncludeExcel(true);
      
      toast.success('Mensaje enviado correctamente');
      onClose();
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as="div">
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Cerrar</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Enviar notificación de stock crítico
                    </Dialog.Title>
                    
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Correo electrónico <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1">
                          <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                          Asunto
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                          Mensaje <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1">
                          <textarea
                            id="message"
                            rows={6}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          id="include-excel"
                          name="include-excel"
                          type="checkbox"
                          checked={includeExcel}
                          onChange={(e) => setIncludeExcel(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="include-excel" className="ml-2 block text-sm text-gray-700">
                          Incluir archivo Excel con detalles
                        </label>
                      </div>

                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button
                          type="submit"
                          disabled={isSending}
                          className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50"
                        >
                          {isSending ? 'Enviando...' : 'Enviar'}
                        </button>
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                          onClick={onClose}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
