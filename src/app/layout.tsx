// src/app/layout.tsx
import "./globals.css";
import SupabaseListener from "@/components/SupabaseListener";
import ConditionalChatbot from "@/components/ConditionalChatbot";
import { ThemeProvider } from "@/context/ThemeContext";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="es">
      <body
        className="min-h-screen bg-cover bg-center"
        style={{ backgroundImage: "url('/fondo.jpeg')" }}
      >
        <ThemeProvider>
          <SupabaseListener />

          {children}

          <ConditionalChatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}