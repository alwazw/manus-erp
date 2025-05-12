
'use client';

import { useEffect, useState } from 'react';

interface SaleItem {
  sku: string;
  quantity: number;
  price: number;
}

interface SaleOrder {
  order_id: string;
  customer_name: string;
  items: SaleItem[];
  total_amount: number;
  status: string;
  order_date: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSales() {
      try {
        const response = await fetch('http://localhost:8000/api/sales');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSales(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, []);

  if (loading) {
    return <p>Loading sales orders...</p>;
  }

  if (error) {
    return <p>Error fetching sales orders: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sales Orders</h1>
      {sales.length === 0 ? (
        <p>No sales orders found.</p>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => (
            <div key={sale.order_id} className="p-4 border rounded-md shadow-sm">
              <h2 className="text-xl font-semibold">Order ID: {sale.order_id}</h2>
              <p>Customer: {sale.customer_name}</p>
              <p>Date: {sale.order_date}</p>
              <p>Status: <span className={`px-2 py-1 text-xs font-semibold rounded-full ${sale.status === 'Completed' ? 'bg-green-200 text-green-800' : sale.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'}`}>{sale.status}</span></p>
              <p>Total Amount: ${sale.total_amount.toFixed(2)}</p>
              <h3 className="text-md font-semibold mt-2">Items:</h3>
              {sale.items.length > 0 ? (
                <ul className="list-disc list-inside ml-4 text-sm">
                  {sale.items.map((item, index) => (
                    <li key={index}>
                      SKU: {item.sku}, Quantity: {item.quantity}, Price: ${item.price.toFixed(2)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">No items in this order.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

