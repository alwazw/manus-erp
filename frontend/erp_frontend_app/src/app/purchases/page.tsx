
'use client';

import { useEffect, useState } from 'react';

interface PurchaseItem {
  sku: string;
  quantity: number;
  cost_price: number;
}

interface PurchaseOrder {
  purchase_id: string;
  supplier_name: string;
  items: PurchaseItem[];
  total_amount: number;
  status: string;
  order_date: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPurchases() {
      try {
        const response = await fetch('http://localhost:8000/api/purchases');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPurchases(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPurchases();
  }, []);

  if (loading) {
    return <p>Loading purchase orders...</p>;
  }

  if (error) {
    return <p>Error fetching purchase orders: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Purchase Orders</h1>
      {purchases.length === 0 ? (
        <p>No purchase orders found.</p>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <div key={purchase.purchase_id} className="p-4 border rounded-md shadow-sm">
              <h2 className="text-xl font-semibold">Order ID: {purchase.purchase_id}</h2>
              <p>Supplier: {purchase.supplier_name}</p>
              <p>Date: {purchase.order_date}</p>
              <p>Status: <span className={`px-2 py-1 text-xs font-semibold rounded-full ${purchase.status === 'Received' ? 'bg-green-200 text-green-800' : purchase.status === 'Ordered' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>{purchase.status}</span></p>
              <p>Total Amount: ${purchase.total_amount.toFixed(2)}</p>
              <h3 className="text-md font-semibold mt-2">Items:</h3>
              {purchase.items.length > 0 ? (
                <ul className="list-disc list-inside ml-4 text-sm">
                  {purchase.items.map((item, index) => (
                    <li key={index}>
                      SKU: {item.sku}, Quantity: {item.quantity}, Cost Price: ${item.cost_price.toFixed(2)}
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

