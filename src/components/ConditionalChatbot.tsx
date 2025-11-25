"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Importación dinámica para evitar problemas de TypeScript
const ChatbotWidget = dynamic(() => import("./ChatbotWidget.jsx"), {
  ssr: false,
  loading: () => null,
});

export default function ConditionalChatbot() {
  const pathname = usePathname();
  
  // No mostrar el chatbot en estas páginas
  const hideChatbotRoutes = ["/login", "/acceso-denegado", "/acceso-restringido"];
  
  if (hideChatbotRoutes.includes(pathname)) {
    return null;
  }
  
  return <ChatbotWidget />;
}
