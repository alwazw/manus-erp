
// Purchases Page - Implements full CRUD for Purchase Orders with modern UI

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
import { PlusCircle, Edit, Trash2, Eye, Truck } from 'lucide-react'; // Removed unused icons
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PurchaseItemInput {
  sku: string;
  quantity: number;
  cost_price: number;
}

interface PurchaseItemDetails extends PurchaseItemInput {
  product_name?: string;
  line_total?: number;
}

interface PurchaseOrder {
  po_id?: number;
  po_number: string;
  supplier_name: string;
  supplier_email?: string;
  order_date: string; 
  expected_delivery_date?: string | null; 
  items: PurchaseItemDetails[];
  total_amount: number;
  status: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [productsForSelection, setProductsForSelection] = useState<ProductQuickPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [currentPurchaseOrder, setCurrentPurchaseOrder] = useState<Partial<PurchaseOrder> | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<PurchaseItemInput[]>([]);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [purchaseOrderToDelete, setPurchaseOrderToDelete] = useState<PurchaseOrder | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [purchaseOrderToView, setPurchaseOrderToView] = useState<PurchaseOrder | null>(null);
  
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [poToUpdateStatus, setPoToUpdateStatus] = useState<PurchaseOrder | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");


  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    const url = `${API_URL}/purchases`;
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
      setPurchases(data);
    } catch (e: any) {
      console.error("Error fetching purchase orders:", { url, error: e });
      setError(e.message || "Failed to fetch purchase orders.");
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
    fetchPurchases();
    fetchProductsForSelection();
  }, [fetchPurchases, fetchProductsForSelection]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentPurchaseOrder((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemInput, value: string | number) => {
    const updatedItems = [...purchaseOrderItems];
    if (field === 'sku') {
        const selectedProduct = productsForSelection.find(p => p.sku === value);
        updatedItems[index] = {
            ...updatedItems[index],
            sku: String(value),
            cost_price: selectedProduct ? (selectedProduct.unit_price || 0) : 0 // Default cost to unit price for simplicity
        };
    } else {
        updatedItems[index] = { 
            ...updatedItems[index], 
            [field]: field === 'quantity' || field === 'cost_price' ? parseFloat(String(value)) || 0 : value 
        };
    }
    setPurchaseOrderItems(updatedItems);
  };

  const addItem = () => {
    setPurchaseOrderItems([...purchaseOrderItems, { sku: '', quantity: 1, cost_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setPurchaseOrderItems(purchaseOrderItems.filter((_, i) => i !== index));
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentPurchaseOrder({
      supplier_name: '',
      supplier_email: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      status: 'Ordered',
      notes: ''
    });
    setPurchaseOrderItems([{ sku: '', quantity: 1, cost_price: 0 }]);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (purchaseOrder: PurchaseOrder) => {
    setIsEditMode(true);
    setCurrentPurchaseOrder({ 
        ...purchaseOrder, 
        order_date: purchaseOrder.order_date ? new Date(purchaseOrder.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expected_delivery_date: purchaseOrder.expected_delivery_date ? new Date(purchaseOrder.expected_delivery_date).toISOString().split('T')[0] : ''
    });
    setPurchaseOrderItems(purchaseOrder.items.map(item => ({ sku: item.sku, quantity: item.quantity, cost_price: item.cost_price })));
    setIsAddEditModalOpen(true);
  };

  const openViewModal = (purchaseOrder: PurchaseOrder) => {
    setPurchaseOrderToView(purchaseOrder);
    setIsViewModalOpen(true);
  };
  
  const openStatusUpdateModal = (po: PurchaseOrder) => {
    setPoToUpdateStatus(po);
    setNewStatus(po.status);
    setIsStatusUpdateModalOpen(true);
  };

  const handleSavePurchaseOrder = async () => {
    if (!currentPurchaseOrder || !currentPurchaseOrder.supplier_name || !currentPurchaseOrder.order_date || purchaseOrderItems.length === 0) {
      alert('Supplier Name, Order Date, and at least one item are required.');
      return;
    }
    if (purchaseOrderItems.some(item => !item.sku || item.quantity <= 0 || item.cost_price < 0)) {
        alert('All items must have a SKU, quantity greater than 0, and a non-negative cost price.');
        return;
    }

    const payload = {
      ...currentPurchaseOrder,
      items: purchaseOrderItems,
      order_date: currentPurchaseOrder.order_date ? new Date(currentPurchaseOrder.order_date).toISOString() : new Date().toISOString(),
      expected_delivery_date: currentPurchaseOrder.expected_delivery_date ? new Date(currentPurchaseOrder.expected_delivery_date).toISOString() : null
    };

    const method = isEditMode && currentPurchaseOrder.po_id ? 'PUT' : 'POST';
    const url = isEditMode && currentPurchaseOrder.po_id ? `${API_URL}/purchases/${currentPurchaseOrder.po_id}` : `${API_URL}/purchases`;

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
      setCurrentPurchaseOrder(null);
      setPurchaseOrderItems([]);
      fetchPurchases();
    } catch (e: any) {
      console.error(`Error saving purchase order (Method: ${method}):`, { url, payload, error: e });
      alert(`Failed to save purchase order: ${e.message}`);
    }
  };
  
  const handleConfirmStatusUpdate = async () => {
    if (!poToUpdateStatus || !poToUpdateStatus.po_id || !newStatus) return;
    const url = `${API_URL}/purchases/${poToUpdateStatus.po_id}/status`;
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
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
        fetchPurchases();
        setIsStatusUpdateModalOpen(false);
        setPoToUpdateStatus(null);
    } catch (e: any) {
        console.error("Error updating PO status:", { url, poId: poToUpdateStatus.po_id, newStatus, error: e });
        alert(`Failed to update PO status: ${e.message}`);
    }
  };

  const openDeleteConfirm = (purchaseOrder: PurchaseOrder) => {
    setPurchaseOrderToDelete(purchaseOrder);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeletePurchaseOrder = async () => {
    if (!purchaseOrderToDelete || !purchaseOrderToDelete.po_id) return;
    const url = `${API_URL}/purchases/${purchaseOrderToDelete.po_id}`;
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
      setPurchaseOrderToDelete(null);
      fetchPurchases();
    } catch (e: any) {
      console.error("Error deleting purchase order:", { url, poId: purchaseOrderToDelete.po_id, error: e });
      alert(`Failed to delete purchase order: ${e.message}`);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ordered': return 'bg-blue-100 text-blue-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'received': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading && purchases.length === 0) {
    return <p className="p-6">Loading purchase orders...</p>;
  }

  if (error) {
    return <p className="p-6 text-destructive">Error fetching purchase orders: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Order Management</h1>
          <p className="text-muted-foreground">Track and manage all supplier purchase orders.</p>
        </div>
        <Button onClick={openAddModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Purchase Order
        </Button>
      </div>

      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Purchase Order' : 'Create New Purchase Order'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the details of the purchase order.' : 'Fill in the details for the new purchase order.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier_name">Supplier Name</Label>
                <Input id="supplier_name" name="supplier_name" value={currentPurchaseOrder?.supplier_name || ''} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="supplier_email">Supplier Email</Label>
                <Input id="supplier_email" name="supplier_email" type="email" value={currentPurchaseOrder?.supplier_email || ''} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="order_date">Order Date</Label>
                <Input id="order_date" name="order_date" type="date" value={currentPurchaseOrder?.order_date || ''} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                <Input id="expected_delivery_date" name="expected_delivery_date" type="date" value={currentPurchaseOrder?.expected_delivery_date || ''} onChange={handleInputChange} />
              </div>
              {isEditMode && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                      name="status"
                      value={currentPurchaseOrder?.status || 'Ordered'}
                      onValueChange={(value) => setCurrentPurchaseOrder(prev => ({...prev, status: value}))}
                  >
                      <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Ordered">Ordered</SelectItem>
                          <SelectItem value="Shipped">Shipped</SelectItem>
                          <SelectItem value="Received">Received</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold mt-4">Items</h3>
            {purchaseOrderItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 items-end gap-2 border-b pb-3 mb-2">
                <div className="col-span-5">
                  <Label htmlFor={`item-sku-${index}`}>Product</Label>
                  <Select 
                    value={item.sku}
                    onValueChange={(value) => handleItemChange(index, 'sku', value)}
                    disabled={isEditMode} 
                  >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                        {productsForSelection.map(p => (
                            <SelectItem key={p.sku} value={p.sku}>{p.name} (SKU: {p.sku})</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`item-quantity-${index}`}>Quantity</Label>
                  <Input id={`item-quantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} disabled={isEditMode} />
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`item-cost_price-${index}`}>Cost Price</Label>
                  <Input id={`item-cost_price-${index}`} type="number" value={item.cost_price} onChange={(e) => handleItemChange(index, 'cost_price', e.target.value)} disabled={isEditMode} />
                </div>
                {!isEditMode && (
                    <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    </div>
                )}
              </div>
            ))}
            {!isEditMode && (
                <Button type="button" variant="outline" onClick={addItem} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
            )}
            
            <div className="mt-4">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={currentPurchaseOrder?.notes || ''} onChange={handleInputChange} placeholder="Optional notes for the purchase order..."/>
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddEditModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSavePurchaseOrder}>Save Purchase Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase order "{purchaseOrderToDelete?.po_number}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurchaseOrderToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePurchaseOrder} variant="destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Purchase Order Details: {purchaseOrderToView?.po_number}</DialogTitle>
          </DialogHeader>
          {purchaseOrderToView && (
            <div className="grid gap-2 py-4 text-sm max-h-[70vh] overflow-y-auto pr-2">
              <p><strong>PO ID:</strong> {purchaseOrderToView.po_id}</p>
              <p><strong>Supplier:</strong> {purchaseOrderToView.supplier_name} ({purchaseOrderToView.supplier_email || 'No email'})</p>
              <p><strong>Order Date:</strong> {new Date(purchaseOrderToView.order_date).toLocaleDateString()}</p>
              <p><strong>Expected Delivery:</strong> {purchaseOrderToView.expected_delivery_date ? new Date(purchaseOrderToView.expected_delivery_date).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Total Amount:</strong> ${purchaseOrderToView.total_amount.toFixed(2)}</p>
              <p><strong>Status:</strong> <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(purchaseOrderToView.status)}`}>{purchaseOrderToView.status}</span></p>
              <h4 className="font-semibold mt-2">Items:</h4>
              {purchaseOrderToView.items.map((item, idx) => (
                <div key={idx} className="border-t pt-1 mt-1">
                  <p>SKU: {item.sku} ({item.product_name || 'Product name not available'})</p>
                  <p>Quantity: {item.quantity} @ ${item.cost_price.toFixed(2)} each</p>
                  <p>Line Total: ${(item.quantity * item.cost_price).toFixed(2)}</p>
                </div>
              ))}
              {purchaseOrderToView.notes && <><h4 className="font-semibold mt-2">Notes:</h4><p className="whitespace-pre-wrap">{purchaseOrderToView.notes}</p></>}
              <p className="mt-2 text-xs text-muted-foreground">Created: {purchaseOrderToView.created_at ? new Date(purchaseOrderToView.created_at).toLocaleString() : 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Last Updated: {purchaseOrderToView.updated_at ? new Date(purchaseOrderToView.updated_at).toLocaleString() : 'N/A'}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog open={isStatusUpdateModalOpen} onOpenChange={setIsStatusUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Update PO Status: {poToUpdateStatus?.po_number}</DialogTitle>
                <DialogDescription>Select the new status for this purchase order. If set to "Received", inventory will be updated.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="new_status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="new_status">
                        <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Ordered">Ordered</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Received">Received</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsStatusUpdateModalOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmStatusUpdate}>Update Status</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>View, create, edit, or delete purchase orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 && !loading ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No purchase orders found.</p>
              <Button onClick={openAddModal} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Create First Purchase Order
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((po) => (
                  <TableRow key={po.po_id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.supplier_name}</TableCell>
                    <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">${po.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1 hover:text-primary" onClick={() => openViewModal(po)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="mr-1 hover:text-primary" onClick={() => openStatusUpdateModal(po)} title="Update Status">
                        <Truck className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="mr-1 hover:text-primary" onClick={() => openEditModal(po)} title="Edit Purchase Order (Details)">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => openDeleteConfirm(po)} title="Delete Purchase Order">
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

