import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Wallet } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Gastos compartidos",
  description: "Divide cuentas con tu grupo, sin instalar nada.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-sans">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-slate-900 transition-opacity hover:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-card">
              <Wallet className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </span>
            <span className="font-semibold tracking-tight">Gastos compartidos</span>
          </Link>
          {children}
        </div>
      </body>
    </html>
  );
}
