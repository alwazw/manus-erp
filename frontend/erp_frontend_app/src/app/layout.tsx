import type { Metadata } from "next";
import Link from 'next/link';
import { Inter } from 'next/font/google';
import './globals.css'; // Import global styles
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, BarChart3, BookUser, Settings, LogOut
} from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: "%s | Manus ERP",
    default: "Manus ERP System",
  },
  description: "Modern Enterprise Resource Planning System by Manus",
};

const SidebarLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) => (
  <Link href={href} className="flex items-center px-4 py-2.5 text-sm font-medium text-sidebar-foreground rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
    <Icon className="mr-3 h-5 w-5" />
    {children}
  </Link>
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-background text-foreground antialiased">
        <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col fixed inset-y-0 left-0 z-50">
            <div className="p-6 border-b border-sidebar-border">
              <Link href="/" className="flex items-center space-x-2">
                {/* Replace with a proper logo if available */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
                <span className="text-2xl font-bold text-foreground">Manus ERP</span>
              </Link>
            </div>
            <nav className="flex-grow p-4 space-y-1">
              <SidebarLink href="/" icon={LayoutDashboard}>Dashboard</SidebarLink>
              <SidebarLink href="/products" icon={ShoppingBag}>Products</SidebarLink>
              <SidebarLink href="/sales" icon={ShoppingCart}>Sales</SidebarLink>
              <SidebarLink href="/purchases" icon={BarChart3}>Purchases</SidebarLink> {/* Changed icon for variety */}
              <SidebarLink href="/accounting" icon={BookUser}>Accounting</SidebarLink>
              <SidebarLink href="/reports" icon={BarChart3}>Reports</SidebarLink>
            </nav>
            <div className="p-4 mt-auto border-t border-sidebar-border space-y-1">
              <SidebarLink href="/settings" icon={Settings}>Settings</SidebarLink>
              {/* Add a logout link/button if authentication is implemented */}
              {/* <SidebarLink href="/logout" icon={LogOut}>Logout</SidebarLink> */}
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col ml-64"> {/* Adjust ml to match sidebar width */}
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4">
              <div className="container mx-auto flex items-center justify-between">
                {/* Placeholder for breadcrumbs or page title */}
                <div className="text-lg font-semibold">Welcome</div> 
                {/* Placeholder for user profile/actions */}
                <div>User Actions</div>
              </div>
            </header>
            
            <main className="flex-grow p-6 overflow-auto">
              {children}
            </main>
            
            <footer className="bg-background border-t p-4 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Manus ERP System. All rights reserved.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}

