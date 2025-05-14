
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
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea"; // Assuming you might want a notes field
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react';

interface SaleItemInput {
  sku: string;
  quantity: number;
  price: number; // Price at the time of sale for this item
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
  order_date: string; // Should be ISO string
  items: SaleItemDetails[];
  total_amount: number;
  status: string;
  shipping_address?: {
    address_line1?: string;
    city?: string;
    country?: string;
  };
  notes?: string;
}

interface ProductQuickPick {
  sku: string;
  name: string;
  unit_price: number;
  quantity?: number; // Available quantity
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
    try {
      const response = await fetch(`${API_URL}/sales`);
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
  }, []);

  const fetchProductsForSelection = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) {
        throw new Error(`HTTP error fetching products! status: ${response.status}`);
      }
      const data = await response.json();
      setProductsForSelection(data.map((p: any) => ({ sku: p.sku, name: p.name, unit_price: p.unit_price, quantity: p.quantity })));
    } catch (e: any) {
      console.error("Failed to fetch products for selection:", e.message);
      // Don't block sales page for this, but log error
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
      order_date: new Date().toISOString().split('T')[0], // Default to today
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

    const payload = {
      ...currentSaleOrder,
      items: saleOrderItems,
      order_date: currentSaleOrder.order_date ? new Date(currentSaleOrder.order_date).toISOString() : new Date().toISOString()
    };

    const method = isEditMode ? 'PUT' : 'POST'; // Assuming PUT for update, though backend might only support status update
    const url = isEditMode && currentSaleOrder.order_id ? `${API_URL}/sales/${currentSaleOrder.order_id}` : `${API_URL}/sales`;

    // Note: The current backend SalesService update is only for status. 
    // A full PUT for editing all order details would be more complex.
    // For now, if isEditMode, we might only allow status updates or specific fields.
    // This example optimistically tries to send the whole payload for POST/PUT.

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setIsAddEditModalOpen(false);
      setCurrentSaleOrder(null);
      setSaleOrderItems([]);
      fetchSales(); // Refresh the list
    } catch (e: any) {
      alert(`Failed to save sales order: ${e.message}`);
    }
  };

  const openDeleteConfirm = (saleOrder: SaleOrder) => {
    setSaleOrderToDelete(saleOrder);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteSaleOrder = async () => {
    if (!saleOrderToDelete || !saleOrderToDelete.order_id) return;
    try {
      const response = await fetch(`${API_URL}/sales/${saleOrderToDelete.order_id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setIsDeleteConfirmOpen(false);
      setSaleOrderToDelete(null);
      fetchSales(); // Refresh the list
    } catch (e: any) {
      alert(`Failed to delete sales order: ${e.message}`);
    }
  };

  if (loading && sales.length === 0) { // Show loading only on initial load
    return <p className="p-4">Loading sales orders...</p>;
  }

  if (error) {
    return <p className="p-4">Error fetching sales orders: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Order Management</h1>
        <Button onClick={openAddModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Sales Order
        </Button>
      </div>

      {/* Add/Edit Sales Order Dialog */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Sales Order' : 'Create New Sales Order'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the details of the sales order.' : 'Fill in the details for the new sales order.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer_name" className="text-right">Customer Name</Label>
              <Input id="customer_name" name="customer_name" value={currentSaleOrder?.customer_name || ''} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer_email" className="text-right">Customer Email</Label>
              <Input id="customer_email" name="customer_email" type="email" value={currentSaleOrder?.customer_email || ''} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="order_date" className="text-right">Order Date</Label>
              <Input id="order_date" name="order_date" type="date" value={currentSaleOrder?.order_date || ''} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Input id="status" name="status" value={currentSaleOrder?.status || 'Pending'} onChange={handleInputChange} className="col-span-3" />
            </div>
            
            <h3 className="text-lg font-semibold mt-4 col-span-4">Shipping Address</h3>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address_line1" className="text-right">Address Line 1</Label>
              <Input id="address_line1" name="address_line1" value={currentSaleOrder?.shipping_address?.address_line1 || ''} onChange={handleShippingInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="city" className="text-right">City</Label>
              <Input id="city" name="city" value={currentSaleOrder?.shipping_address?.city || ''} onChange={handleShippingInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="country" className="text-right">Country</Label>
              <Input id="country" name="country" value={currentSaleOrder?.shipping_address?.country || ''} onChange={handleShippingInputChange} className="col-span-3" />
            </div>

            <h3 className="text-lg font-semibold mt-4 col-span-4">Items</h3>
            {saleOrderItems.map((item, index) => (
              <div key={index} className="grid grid-cols-10 items-center gap-2 border-b pb-2 mb-2">
                <div className="col-span-4">
                  <Label htmlFor={`item-sku-${index}`}>Product SKU</Label>
                  <select 
                    id={`item-sku-${index}`} 
                    value={item.sku}
                    onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select Product</option>
                    {productsForSelection.map(p => (
                        <option key={p.sku} value={p.sku}>{p.name} (SKU: {p.sku}) - Stock: {p.quantity ?? 'N/A'}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`item-quantity-${index}`}>Quantity</Label>
                  <Input id={`item-quantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`item-price-${index}`}>Price</Label>
                  <Input id={`item-price-${index}`} type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} />
                </div>
                <div className="col-span-2 flex items-end">
                  <Button type="button" variant="outline" size="icon" onClick={() => removeItem(index)} className="mt-1 text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItem} className="mt-2 col-span-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
            
            <div className="grid grid-cols-4 items-start gap-4 mt-4">
                <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                <Textarea id="notes" name="notes" value={currentSaleOrder?.notes || ''} onChange={handleInputChange} className="col-span-3" placeholder="Optional notes for the order..."/>
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddEditModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSaveSaleOrder}>Save Sales Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction onClick={handleDeleteSaleOrder} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* View Sales Order Details Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Sales Order Details: {saleOrderToView?.order_number}</DialogTitle>
          </DialogHeader>
          {saleOrderToView && (
            <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
              <p><strong>Customer:</strong> {saleOrderToView.customer_name}</p>
              <p><strong>Email:</strong> {saleOrderToView.customer_email || 'N/A'}</p>
              <p><strong>Order Date:</strong> {new Date(saleOrderToView.order_date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> {saleOrderToView.status}</p>
              <p><strong>Total Amount:</strong> ${saleOrderToView.total_amount.toFixed(2)}</p>
              {saleOrderToView.shipping_address && (
                <div className="mt-2">
                  <p><strong>Shipping Address:</strong></p>
                  <p className="ml-4">{saleOrderToView.shipping_address.address_line1}</p>
                  <p className="ml-4">{saleOrderToView.shipping_address.city}, {saleOrderToView.shipping_address.country}</p>
                </div>
              )}
              {saleOrderToView.notes && <p className="mt-2"><strong>Notes:</strong> {saleOrderToView.notes}</p>}
              <h4 className="font-semibold mt-3 mb-1">Items:</h4>
              <ul className="list-disc list-inside ml-4 text-sm">
                {saleOrderToView.items.map((item, index) => (
                  <li key={index}>
                    {item.product_name || item.sku} - Qty: {item.quantity}, Price: ${item.price.toFixed(2)}, Total: ${(item.quantity * item.price).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {sales.length === 0 && !loading ? (
        <p>No sales orders found. Click "Create New Sales Order" to get started.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${sale.status === 'Completed' ? 'bg-green-100 text-green-700' : sale.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : sale.status === 'Shipped' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {sale.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="mr-1" onClick={() => openViewModal(sale)} title="View Details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="mr-1" onClick={() => openEditModal(sale)} title="Edit Order">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => openDeleteConfirm(sale)} title="Delete Order">
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

