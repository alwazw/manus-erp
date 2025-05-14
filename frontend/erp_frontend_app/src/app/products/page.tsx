
// Products Page - Implements full CRUD for Products with modern UI

'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Product {
  product_id?: number;
  sku: string;
  name: string;
  description?: string | null;
  category_name?: string | null;
  unit_price?: number | null;
  average_cost?: number | null;
  last_purchase_price?: number | null;
  quantity?: number | null;
  inventory_level_status: string;
  reorder_point?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const API_URL = 
  process.env.NEXT_PUBLIC_API_URL || "/api";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [productToView, setProductToView] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const url = `${API_URL}/products`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (jsonError) {
            // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setProducts(data);
    } catch (e: any) {
      console.error("Error fetching products:", { url, error: e });
      setError(e.message || "Failed to fetch products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentProduct((prev: any) => ({
      ...prev,
      [name]: name === 'unit_price' || name === 'quantity' || name === 'average_cost' || name === 'last_purchase_price' || name === 'reorder_point' 
              ? parseFloat(value) || null
              : value,
    }));
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentProduct({
      sku: '',
      name: '',
      category_name: '',
      unit_price: null,
      quantity: null,
      description: '',
      inventory_level_status: 'In Stock',
      reorder_point: null,
    });
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setIsEditMode(true);
    setCurrentProduct({ ...product });
    setIsAddEditModalOpen(true);
  };
  
  const openViewModal = (product: Product) => {
    setProductToView(product);
    setIsViewModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!currentProduct || !currentProduct.sku || !currentProduct.name) {
      alert('SKU and Name are required.');
      return;
    }
    const payload = {
        ...currentProduct,
        category: currentProduct.category_name, 
    };

    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode ? `${API_URL}/products/${currentProduct.sku}` : `${API_URL}/products`;

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (jsonError) {
            // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }
      setIsAddEditModalOpen(false);
      setCurrentProduct(null);
      fetchProducts();
    } catch (e: any) {
      console.error(`Error saving product (Method: ${method}):`, { url, payload, error: e });
      alert(`Failed to save product: ${e.message}`);
    }
  };

  const openDeleteConfirm = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    const url = `${API_URL}/products/${productToDelete.sku}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (jsonError) {
            // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }
      setIsDeleteConfirmOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (e: any) {
      console.error("Error deleting product:", { url, productSKU: productToDelete.sku, error: e });
      alert(`Failed to delete product: ${e.message}`);
    }
  };

  if (loading && products.length === 0) {
    return <p className="p-6">Loading products...</p>;
  }

  if (error) {
    return <p className="p-6 text-destructive">Error fetching products: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-muted-foreground">Manage your product catalog, inventory, and pricing.</p>
        </div>
        <Button onClick={openAddModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
        </Button>
      </div>

      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the details of the product.' : 'Fill in the details for the new product.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sku" className="text-right">SKU</Label>
              <Input id="sku" name="sku" value={currentProduct?.sku || ''} onChange={handleInputChange} className="col-span-3" disabled={isEditMode} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" name="name" value={currentProduct?.name || ''} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_name" className="text-right">Category</Label>
              <Input id="category_name" name="category_name" value={currentProduct?.category_name || ''} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit_price" className="text-right">Unit Price</Label>
              <Input id="unit_price" name="unit_price" type="number" placeholder="0.00" value={currentProduct?.unit_price ?? ''} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" placeholder="0" value={currentProduct?.quantity ?? ''} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">Description</Label>
              <Textarea id="description" name="description" placeholder="Optional product description..." value={currentProduct?.description || ''} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="inventory_level_status" className="text-right">Status</Label>
              <Input id="inventory_level_status" name="inventory_level_status" value={currentProduct?.inventory_level_status || 'In Stock'} onChange={handleInputChange} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reorder_point" className="text-right">Reorder Point</Label>
              <Input id="reorder_point" name="reorder_point" type="number" placeholder="0" value={currentProduct?.reorder_point ?? ''} onChange={handleInputChange} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddEditModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSaveProduct}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product "{productToDelete?.name}" (SKU: {productToDelete?.sku}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} variant="destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Product Details: {productToView?.name}</DialogTitle>
          </DialogHeader>
          {productToView && (
            <div className="grid gap-2 py-4 text-sm">
              <p><strong>SKU:</strong> {productToView.sku}</p>
              <p><strong>Category:</strong> {productToView.category_name || 'N/A'}</p>
              <p><strong>Unit Price:</strong> ${productToView.unit_price?.toFixed(2) ?? 'N/A'}</p>
              <p><strong>Quantity:</strong> {productToView.quantity ?? 'N/A'}</p>
              <p><strong>Status:</strong> {productToView.inventory_level_status}</p>
              <p><strong>Description:</strong> {productToView.description || 'N/A'}</p>
              <p><strong>Avg. Cost:</strong> ${productToView.average_cost?.toFixed(2) ?? 'N/A'}</p>
              <p><strong>Last Purchase Price:</strong> ${productToView.last_purchase_price?.toFixed(2) ?? 'N/A'}</p>
              <p><strong>Reorder Point:</strong> {productToView.reorder_point ?? 'N/A'}</p>
              <p><strong>Created:</strong> {productToView.created_at ? new Date(productToView.created_at).toLocaleString() : 'N/A'}</p>
              <p><strong>Updated:</strong> {productToView.updated_at ? new Date(productToView.updated_at).toLocaleString() : 'N/A'}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>View, add, edit, or delete products from your catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 && !loading ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No products found.</p>
              <Button onClick={openAddModal} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Product
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell className="font-medium">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category_name || 'N/A'}</TableCell>
                    <TableCell className="text-right">${product.unit_price?.toFixed(2) ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">{product.quantity ?? 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full 
                        ${product.inventory_level_status === 'In Stock' ? 'bg-green-100 text-green-700' : 
                          product.inventory_level_status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' : 
                          product.inventory_level_status === 'Out of Stock' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {product.inventory_level_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1 hover:text-primary" onClick={() => openViewModal(product)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="mr-1 hover:text-primary" onClick={() => openEditModal(product)} title="Edit Product">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => openDeleteConfirm(product)} title="Delete Product">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

