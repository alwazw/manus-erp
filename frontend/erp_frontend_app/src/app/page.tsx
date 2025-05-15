
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
import {
  ShoppingBag, ShoppingCart, BarChart3, BookUser, ExternalLink, Server 
} from 'lucide-react';

const moduleLinks = [
  { title: 'Product Management', description: 'Manage your product catalog, SKUs, categories, and inventory levels.', href: '/products', icon: ShoppingBag },
  { title: 'Sales Orders', description: 'Record and track customer sales orders and their statuses.', href: '/sales', icon: ShoppingCart },
  { title: 'Purchase Orders', description: 'Manage purchase orders with suppliers and track incoming stock.', href: '/purchases', icon: BarChart3 }, // Re-using BarChart3, consider a more specific icon if available
  { title: 'Reporting & Analytics', description: 'View sales, inventory, and purchase reports.', href: '/reports', icon: BarChart3 },
  { title: 'Accounting', description: 'Manage chart of accounts and journal entries.', href: '/accounting', icon: BookUser },
];

const externalToolLinks = [
  { name: "Adminer (Database Admin)", href: "http://localhost:8080" },
  { name: "Grafana (Monitoring)", href: "http://localhost:3000" },
  { name: "Homepage Dashboard (Service Overview)", href: "http://localhost:3001" },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">Welcome to Manus ERP</h1>
        <p className="text-lg text-muted-foreground mt-2">Your central hub for managing business operations efficiently.</p>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Core Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleLinks.map((module) => (
            <Link href={module.href} key={module.title} className="block group">
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 ease-in-out hover:border-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-medium">
                    {module.title}
                  </CardTitle>
                  <module.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="mr-2 h-5 w-5 text-primary" />
              System Status & Quick Links
            </CardTitle>
            <CardDescription>
              Overview of system services and links to external management tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">
              Backend API: <code className="px-1 py-0.5 bg-muted rounded-sm font-mono text-sm">http://localhost:8000</code> 
              (Status: <span className="font-semibold text-green-600">Operational</span>)
            </p>
            <p className="text-sm text-muted-foreground">
              This ERP system is actively under development. More features and refinements are on the way.
            </p>
            <div>
              <h3 className="text-md font-semibold text-foreground mb-1.5">External Management Tools:</h3>
              <ul className="space-y-1">
                {externalToolLinks.map(link => (
                  <li key={link.name}>
                    <a 
                      href={link.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-primary hover:underline flex items-center group"
                    >
                      {link.name}
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

