import type { Metadata } from "next";
import Link from 'next/link';
import './globals.css'; // Import global styles

export const metadata: Metadata = {
  title: "ERP System",
  description: "Enterprise Resource Planning System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-gray-800 text-white p-4">
            <nav className="container mx-auto flex justify-between items-center">
              <Link href="/" className="text-xl font-bold">ERP System</Link>
              <div className="space-x-4">
                <Link href="/products" className="hover:text-gray-300">Products</Link>
                <Link href="/sales" className="hover:text-gray-300">Sales</Link>
                <Link href="/purchases" className="hover:text-gray-300">Purchases</Link>
                <Link href="/reports" className="hover:text-gray-300">Reports</Link>
                <Link href="/accounting" className="hover:text-gray-300">Accounting</Link>
              </div>
            </nav>
          </header>
          <main className="flex-grow container mx-auto p-4">
            {children}
          </main>
          <footer className="bg-gray-200 text-center p-4 text-sm text-gray-600">
            © 2025 ERP System - Powered by Manus
          </footer>
        </div>
      </body>
    </html>
  );
}

