import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { Inter } from "next/font/google";

export const metadata: Metadata = {
  title: "Orinoco Quality & Control — LIMS",
  description: "Sistema de Gestión de Calibraciones conforme ISO/IEC 17025",
  icons: {
    icon: "/icon.svg",
  },
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`theme-light ${inter.className}`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
