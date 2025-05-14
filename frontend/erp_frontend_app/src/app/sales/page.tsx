
// Sales Page - Implements full CRUD for Sales Orders with modern UI

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
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react'; // Removed unused icons for now
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SaleItemInput {
  sku: string;
  quantity: number;
  price: number; 
}

interface SaleItemDetails extends SaleItemInput {
  product_name?: string;
  line_total?: number;
}

interface SaleOrder {
  order_id?: number;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  order_date: string; 
  items: SaleItemDetails[];
  total_amount: number;
  status: string;
  shipping_address?: {
    address_line1?: string;
    city?: string;
    country?: string;
  };
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProductQuickPick {
  sku: string;
  name: string;
  unit_price: number;
  quantity?: number; 
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function SalesPage() {
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [productsForSelection, setProductsForSelection] = useState<ProductQuickPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [currentSaleOrder, setCurrentSaleOrder] = useState<Partial<SaleOrder> | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saleOrderItems, setSaleOrderItems] = useState<SaleItemInput[]>([]);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [saleOrderToDelete, setSaleOrderToDelete] = useState<SaleOrder | null>(null);
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [saleOrderToView, setSaleOrderToView] = useState<SaleOrder | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    const url = `${API_URL}/sales`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (jsonError) {
            // Response was not JSON
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setSales(data);
    } catch (e: any) {
      console.error("Error fetching sales orders:", { url, error: e });
      setError(e.message || "Failed to fetch sales orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductsForSelection = useCallback(async () => {
    const url = `${API_URL}/products`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = `HTTP error fetching products! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (jsonError) {
            // Response was not JSON
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setProductsForSelection(data.map((p: any) => ({ sku: p.sku, name: p.name, unit_price: p.unit_price, quantity: p.quantity })));
    } catch (e: any) {
      console.error("Error fetching products for selection:", { url, error: e });
      // Optionally set an error state if this is critical for UI
    }
  }, []);

  useEffect(() => {
    fetchSales();
    fetchProductsForSelection();
  }, [fetchSales, fetchProductsForSelection]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentSaleOrder((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleShippingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentSaleOrder((prev: any) => ({
        ...prev,
        shipping_address: {
            ...(prev.shipping_address || {}),
            [name]: value,
        }
    }));
  };

  const handleItemChange = (index: number, field: keyof SaleItemInput, value: string | number) => {
    const updatedItems = [...saleOrderItems];
    if (field === 'sku') {
        const selectedProduct = productsForSelection.find(p => p.sku === value);
        updatedItems[index] = {
            ...updatedItems[index],
            sku: String(value),
            price: selectedProduct ? selectedProduct.unit_price : 0 
        };
    } else {
        updatedItems[index] = { 
            ...updatedItems[index], 
            [field]: field === 'quantity' || field === 'price' ? parseFloat(String(value)) || 0 : value 
        };
    }
    setSaleOrderItems(updatedItems);
  };

  const addItem = () => {
    setSaleOrderItems([...saleOrderItems, { sku: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    setSaleOrderItems(saleOrderItems.filter((_, i) => i !== index));
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentSaleOrder({
      customer_name: '',
      customer_email: '',
      order_date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      shipping_address: { address_line1: '', city: '', country: '' },
      notes: ''
    });
    setSaleOrderItems([{ sku: '', quantity: 1, price: 0 }]);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (saleOrder: SaleOrder) => {
    setIsEditMode(true);
    setCurrentSaleOrder({ 
        ...saleOrder, 
        order_date: saleOrder.order_date ? new Date(saleOrder.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setSaleOrderItems(saleOrder.items.map(item => ({ sku: item.sku, quantity: item.quantity, price: item.price })));
    setIsAddEditModalOpen(true);
  };
  
  const openViewModal = (saleOrder: SaleOrder) => {
    setSaleOrderToView(saleOrder);
    setIsViewModalOpen(true);
  };

  const handleSaveSaleOrder = async () => {
    if (!currentSaleOrder || !currentSaleOrder.customer_name || !currentSaleOrder.order_date || saleOrderItems.length === 0) {
      alert('Customer Name, Order Date, and at least one item are required.');
      return;
    }
    if (saleOrderItems.some(item => !item.sku || item.quantity <= 0 || item.price < 0)) {
        alert('All items must have a SKU, quantity greater than 0, and a non-negative price.');
        return;
    }

    const payload = {
      ...currentSaleOrder,
      items: saleOrderItems,
      order_date: currentSaleOrder.order_date ? new Date(currentSaleOrder.order_date).toISOString() : new Date().toISOString()
    };

    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode && currentSaleOrder.order_id ? `${API_URL}/sales/${currentSaleOrder.order_id}` : `${API_URL}/sales`;

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
            // Response was not JSON
        }
        throw new Error(errorMsg);
      }
      setIsAddEditModalOpen(false);
      setCurrentSaleOrder(null);
      setSaleOrderItems([]);
      fetchSales(); 
    } catch (e: any) {
      console.error(`Error saving sales order (Method: ${method}):`, { url, payload, error: e });
      alert(`Failed to save sales order: ${e.message}`);
    }
  };

  const openDeleteConfirm = (saleOrder: SaleOrder) => {
    setSaleOrderToDelete(saleOrder);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteSaleOrder = async () => {
    if (!saleOrderToDelete || !saleOrderToDelete.order_id) return;
    const url = `${API_URL}/sales/${saleOrderToDelete.order_id}`;
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
            // Response was not JSON
        }
        throw new Error(errorMsg);
      }
      setIsDeleteConfirmOpen(false);
      setSaleOrderToDelete(null);
      fetchSales(); 
    } catch (e: any) {
      console.error("Error deleting sales order:", { url, orderId: saleOrderToDelete.order_id, error: e });
      alert(`Failed to delete sales order: ${e.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading && sales.length === 0) {
    return <p className="p-6">Loading sales orders...</p>;
  }

  if (error) {
    return <p className="p-6 text-destructive">Error fetching sales orders: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Order Management</h1>
          <p className="text-muted-foreground">Track and manage all customer sales orders.</p>
        </div>
        <Button onClick={openAddModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Sales Order
        </Button>
      </div>

      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Sales Order' : 'Create New Sales Order'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the details of the sales order.' : 'Fill in the details for the new sales order.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input id="customer_name" name="customer_name" value={currentSaleOrder?.customer_name || ''} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input id="customer_email" name="customer_email" type="email" value={currentSaleOrder?.customer_email || ''} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="order_date">Order Date</Label>
                <Input id="order_date" name="order_date" type="date" value={currentSaleOrder?.order_date || ''} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                    name="status"
                    value={currentSaleOrder?.status || 'Pending'}
                    onValueChange={(value) => setCurrentSaleOrder(prev => ({...prev, status: value}))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mt-4">Shipping Address</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input id="address_line1" name="address_line1" value={currentSaleOrder?.shipping_address?.address_line1 || ''} onChange={handleShippingInputChange} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" value={currentSaleOrder?.shipping_address?.city || ''} onChange={handleShippingInputChange} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" value={currentSaleOrder?.shipping_address?.country || ''} onChange={handleShippingInputChange} />
              </div>
            </div>

            <h3 className="text-lg font-semibold mt-4">Items</h3>
            {saleOrderItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 items-end gap-2 border-b pb-3 mb-2">
                <div className="col-span-5">
                  <Label htmlFor={`item-sku-${index}`}>Product</Label>
                  <Select 
                    value={item.sku}
                    onValueChange={(value) => handleItemChange(index, 'sku', value)}
                  >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                        {productsForSelection.map(p => (
                            <SelectItem key={p.sku} value={p.sku}>{p.name} (SKU: {p.sku}) - Stock: {p.quantity ?? 'N/A'}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`item-quantity-${index}`}>Quantity</Label>
                  <Input id={`item-quantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`item-price-${index}`}>Price</Label>
                  <Input id={`item-price-${index}`} type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItem} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
            
            <div className="mt-4">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={currentSaleOrder?.notes || ''} onChange={handleInputChange} placeholder="Optional notes for the order..."/>
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddEditModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSaveSaleOrder}>Save Sales Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sales order "{saleOrderToDelete?.order_number}". Inventory levels for items in this order will be reverted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleOrderToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSaleOrder} variant="destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sales Order Details: {saleOrderToView?.order_number}</DialogTitle>
          </DialogHeader>
          {saleOrderToView && (
            <div className="grid gap-2 py-4 text-sm max-h-[70vh] overflow-y-auto pr-2">
              <p><strong>Order ID:</strong> {saleOrderToView.order_id}</p>
              <p><strong>Customer:</strong> {saleOrderToView.customer_name} ({saleOrderToView.customer_email || 'No email'})</p>
              <p><strong>Order Date:</strong> {new Date(saleOrderToView.order_date).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ${saleOrderToView.total_amount.toFixed(2)}</p>
              <p><strong>Status:</strong> <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(saleOrderToView.status)}`}>{saleOrderToView.status}</span></p>
              <h4 className="font-semibold mt-2">Shipping Address:</h4>
              <p>{saleOrderToView.shipping_address?.address_line1 || 'N/A'}</p>
              <p>{saleOrderToView.shipping_address?.city || 'N/A'}, {saleOrderToView.shipping_address?.country || 'N/A'}</p>
              <h4 className="font-semibold mt-2">Items:</h4>
              {saleOrderToView.items.map((item, idx) => (
                <div key={idx} className="border-t pt-1 mt-1">
                  <p>SKU: {item.sku} ({item.product_name || 'Product name not available'})</p>
                  <p>Quantity: {item.quantity} @ ${item.price.toFixed(2)} each</p>
                  <p>Line Total: ${(item.quantity * item.price).toFixed(2)}</p>
                </div>
              ))}
              {saleOrderToView.notes && <><h4 className="font-semibold mt-2">Notes:</h4><p className="whitespace-pre-wrap">{saleOrderToView.notes}</p></>}
              <p className="mt-2 text-xs text-muted-foreground">Created: {saleOrderToView.created_at ? new Date(saleOrderToView.created_at).toLocaleString() : 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Last Updated: {saleOrderToView.updated_at ? new Date(saleOrderToView.updated_at).toLocaleString() : 'N/A'}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Sales Orders</CardTitle>
          <CardDescription>View, create, edit, or delete sales orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 && !loading ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No sales orders found.</p>
              <Button onClick={openAddModal} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Create First Sales Order
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.order_id}>
                    <TableCell className="font-medium">{sale.order_number}</TableCell>
                    <TableCell>{sale.customer_name}</TableCell>
                    <TableCell>{new Date(sale.order_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">${sale.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1 hover:text-primary" onClick={() => openViewModal(sale)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="mr-1 hover:text-primary" onClick={() => openEditModal(sale)} title="Edit Sales Order">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => openDeleteConfirm(sale)} title="Delete Sales Order">
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

