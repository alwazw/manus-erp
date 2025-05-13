
'use client';

import { useEffect, useState } from 'react';

interface Product {
  sku: string;
  name: string;
  category: string;
  inventory_level_status: string;
  quantity?: number;
}

// Construct the API URL using the environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setProducts(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) {
    return <p>Loading products...</p>;
  }

  if (error) {
    return <p>Error fetching products: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Product List</h1>
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ul className="space-y-2">
          {products.map((product) => (
            <li key={product.sku} className="p-4 border rounded-md shadow-sm">
              <h2 className="text-xl font-semibold">{product.name} (SKU: {product.sku})</h2>
              <p>Category: {product.category}</p>
              <p>Status: {product.inventory_level_status}</p>
              {product.quantity !== undefined && <p>Quantity: {product.quantity}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

