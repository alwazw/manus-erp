
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

interface Product {
  product_id: number;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit_price?: number | null;
  average_cost?: number | null;
  last_purchase_price?: number | null;
  quantity?: number | null;
  inventory_level_status: string;
  reorder_point?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    sku: '',
    name: '',
    category: '',
    unit_price: 0,
    quantity: 0,
    description: '',
    inventory_level_status: 'In Stock',
  });

  const fetchProducts = async () => {
    setLoading(true);
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
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({
      ...prev,
      [name]: name === 'unit_price' || name === 'quantity' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleAddProduct = async () => {
    if (!newProduct.sku || !newProduct.name || !newProduct.category) {
      alert('SKU, Name, and Category are required.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setIsAddProductModalOpen(false);
      setNewProduct({ sku: '', name: '', category: '', unit_price: 0, quantity: 0, description: '', inventory_level_status: 'In Stock' });
      fetchProducts(); // Refresh the list
    } catch (e: any) {
      alert(`Failed to add product: ${e.message}`);
    }
  };

  if (loading) {
    return <p className="p-4">Loading products...</p>;
  }

  if (error) {
    return <p className="p-4">Error fetching products: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <Dialog open={isAddProductModalOpen} onOpenChange={setIsAddProductModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddProductModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Fill in the details for the new product.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sku" className="text-right">SKU</Label>
                <Input id="sku" name="sku" value={newProduct.sku} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" value={newProduct.name} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <Input id="category" name="category" value={newProduct.category} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit_price" className="text-right">Unit Price</Label>
                <Input id="unit_price" name="unit_price" type="number" value={newProduct.unit_price || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" value={newProduct.quantity || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea id="description" name="description" value={newProduct.description} onChange={handleInputChange} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="inventory_level_status" className="text-right">Status</Label>
                <Input id="inventory_level_status" name="inventory_level_status" value={newProduct.inventory_level_status} onChange={handleInputChange} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddProductModalOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleAddProduct}>Save Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <p>No products found. Click "Add New Product" to get started.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.sku}>
                  <TableCell className="font-medium">{product.sku}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">${product.unit_price?.toFixed(2) ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">{product.quantity ?? 'N/A'}</TableCell>
                  <TableCell>{product.inventory_level_status}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="mr-2">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

