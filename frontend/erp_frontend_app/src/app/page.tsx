
'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800">Welcome to the ERP System</h1>
        <p className="text-lg text-gray-600 mt-2">Manage your business operations efficiently.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {
          [
            { title: 'Product Management', description: 'Manage your product catalog, SKUs, categories, and inventory levels.', href: '/products', icon: '📦' },
            { title: 'Sales Orders', description: 'Record and track customer sales orders and their statuses.', href: '/sales', icon: '🛒' },
            { title: 'Purchase Orders', description: 'Manage purchase orders with suppliers and track incoming stock.', href: '/purchases', icon: '🚚' },
            { title: 'Reporting & Analytics', description: 'View sales, inventory, and purchase reports. (Basic reports implemented)', href: '/reports', icon: '📊' },
            { title: 'Accounting', description: 'Manage chart of accounts and journal entries. (Basic features implemented)', href: '/accounting', icon: '🧾' },
            // Add more modules as they are developed
          ].map((module) => (
            <Link href={module.href} key={module.title} className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 transition-colors">
              <div className="flex items-center mb-3">
                <span className="text-3xl mr-3">{module.icon}</span>
                <h2 className="text-2xl font-semibold text-gray-700">{module.title}</h2>
              </div>
              <p className="text-gray-600">{module.description}</p>
            </Link>
          ))
        }
      </div>

      <section className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-2xl font-semibold text-blue-700 mb-3">System Status & Quick Links</h2>
        <p className="text-gray-700 mb-1">Backend API: <span className="font-mono bg-gray-200 px-1 rounded">http://localhost:8000</span> (Status: <span className="text-green-600 font-semibold">Operational</span>)</p>
        <p className="text-gray-700">This frontend is a work in progress. More features and interactive elements will be added.</p>
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-blue-600">External Management Tools (if running locally):</h3>
          <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
            <li>Adminer (Database Admin): <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">http://localhost:8080</a></li>
            <li>Grafana (Monitoring): <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">http://localhost:3000</a></li>
            <li>Homepage Dashboard: <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">http://localhost:3001</a></li>
          </ul>
        </div>
      </section>
    </div>
  );
}

