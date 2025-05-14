
// Purchases Page - Implements full CRUD for Purchase Orders

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
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react

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
  order_date: string; // ISO string
  expected_delivery_date?: string | null; // ISO string
  items: PurchaseItemDetails[];
  total_amount: number;
  status: string;
  notes?: string;
}

interface ProductQuickPick {
  sku: string;
  name: string;
  unit_price: number; // Or last_purchase_price if more relevant for POs
  quantity?: number; // Available quantity (might not be relevant for PO item selection)
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

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/purchases`);
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
            cost_price: selectedProduct ? selectedProduct.unit_price : 0 // Default cost to product's unit price, can be overridden
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

  const handleSavePurchaseOrder = async () => {
    if (!currentPurchaseOrder || !currentPurchaseOrder.supplier_name || !currentPurchaseOrder.order_date || purchaseOrderItems.length === 0) {
      alert('Supplier Name, Order Date, and at least one item are required.');
      return;
    }

    const payload = {
      ...currentPurchaseOrder,
      items: purchaseOrderItems,
      order_date: currentPurchaseOrder.order_date ? new Date(currentPurchaseOrder.order_date).toISOString() : new Date().toISOString(),
      expected_delivery_date: currentPurchaseOrder.expected_delivery_date ? new Date(currentPurchaseOrder.expected_delivery_date).toISOString() : null
    };

    // For edit mode, the backend currently only supports status updates via a separate endpoint.
    // A full PUT for editing all PO details would require backend changes.
    // This example will proceed as if a full PUT is available for simplicity, or POST for new.
    const method = isEditMode && currentPurchaseOrder.po_id ? 'PUT' : 'POST'; 
    let url = `${API_URL}/purchases`;
    if (isEditMode && currentPurchaseOrder.po_id) {
        // If we had a general PUT endpoint for POs: url = `${API_URL}/purchases/${currentPurchaseOrder.po_id}`;
        // For now, if editing, we might just update status or specific fields if backend supports it.
        // This example assumes a general PUT for simplicity, which might not align with current backend SalesService update logic.
        // For Purchases, let's assume we are updating status if editing, or creating if new.
        // The backend record_purchase can be adapted or a new update_purchase_order endpoint created.
        // For now, we'll focus on creating new. Edit will be limited to status update via separate action.
        if (method === 'PUT') {
             alert("Full edit for Purchase Orders is not yet implemented. Only status updates are typically handled separately. This save will attempt to update status if that's the only change or re-create if it's a new PO structure.");
             // Potentially, only allow status changes here or call a specific status update endpoint.
             // For simplicity, this example will try to POST if it's a new structure, which isn't ideal for PUT.
             // A proper PUT endpoint on the backend is needed for full PO edit.
             // Let's assume for now edit only changes status, handled by a separate button/action.
             // So, this save button in edit mode might be disabled or have different logic.
             // For this iteration, let's make the save button primarily for ADDING new POs.
             // And edit will be handled by a status update mechanism.
             // This means the 'isEditMode' logic for save needs refinement based on backend capabilities.

             // For now, let's simplify: if isEditMode, we assume we are updating status (if changed).
             // This is a placeholder for a more robust edit.
             if (currentPurchaseOrder.status !== purchases.find(p => p.po_id === currentPurchaseOrder.po_id)?.status) {
                try {
                    const statusUpdateResponse = await fetch(`${API_URL}/purchases/${currentPurchaseOrder.po_id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: currentPurchaseOrder.status })
                    });
                    if (!statusUpdateResponse.ok) {
                        const errorData = await statusUpdateResponse.json();
                        throw new Error(errorData.error || `HTTP error! status: ${statusUpdateResponse.status}`);
                    }
                    fetchPurchases();
                    setIsAddEditModalOpen(false);
                    return;
                } catch (e: any) {
                    alert(`Failed to update PO status: ${e.message}`);
                    return;
                }
             }
             alert("No changes detected or full edit not supported via this form yet. Use status update actions.");
             setIsAddEditModalOpen(false);
             return;
        }
    }

    try {
      const response = await fetch(url, {
        method: 'POST', // Forcing POST for new PO creation
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
      setCurrentPurchaseOrder(null);
      setPurchaseOrderItems([]);
      fetchPurchases(); // Refresh the list
    } catch (e: any) {
      alert(`Failed to save purchase order: ${e.message}`);
    }
  };

  const handleUpdateStatus = async (poId: number, newStatus: string) => {
    try {
        const response = await fetch(`${API_URL}/purchases/${poId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        fetchPurchases(); // Refresh list to show updated status and potentially updated inventory/costs
    } catch (e: any) {
        alert(`Failed to update PO status: ${e.message}`);
    }
  };

  const openDeleteConfirm = (purchaseOrder: PurchaseOrder) => {
    setPurchaseOrderToDelete(purchaseOrder);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeletePurchaseOrder = async () => {
    if (!purchaseOrderToDelete || !purchaseOrderToDelete.po_id) return;
    try {
      const response = await fetch(`${API_URL}/purchases/${purchaseOrderToDelete.po_id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setIsDeleteConfirmOpen(false);
      setPurchaseOrderToDelete(null);
      fetchPurchases(); // Refresh the list
    } catch (e: any) {
      alert(`Failed to delete purchase order: ${e.message}`);
    }
  };

  if (loading && purchases.length === 0) {
    return <p className="p-4">Loading purchase orders...</p>;
  }

  if (error) {
    return <p className="p-4">Error fetching purchase orders: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase Order Management</h1>
        <Button onClick={openAddModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Purchase Order
        </Button>
      </div>

      {/* Add/Edit Purchase Order Dialog */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Purchase Order (Status Only)' : 'Create New Purchase Order'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the status of the purchase order.' : 'Fill in the details for the new purchase order.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier_name" className="text-right">Supplier Name</Label>
              <Input id="supplier_name" name="supplier_name" value={currentPurchaseOrder?.supplier_name || ''} onChange={handleInputChange} className="col-span-3" disabled={isEditMode} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier_email" className="text-right">Supplier Email</Label>
              <Input id="supplier_email" name="supplier_email" type="email" value={currentPurchaseOrder?.supplier_email || ''} onChange={handleInputChange} className="col-span-3" disabled={isEditMode} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="order_date" className="text-right">Order Date</Label>
              <Input id="order_date" name="order_date" type="date" value={currentPurchaseOrder?.order_date || ''} onChange={handleInputChange} className="col-span-3" disabled={isEditMode} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expected_delivery_date" className="text-right">Expected Delivery</Label>
              <Input id="expected_delivery_date" name="expected_delivery_date" type="date" value={currentPurchaseOrder?.expected_delivery_date || ''} onChange={handleInputChange} className="col-span-3" disabled={isEditMode} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Input id="status" name="status" value={currentPurchaseOrder?.status || 'Ordered'} onChange={handleInputChange} className="col-span-3" />
            </div>
            
            {!isEditMode && (
              <>
                <h3 className="text-lg font-semibold mt-4 col-span-4">Items</h3>
                {purchaseOrderItems.map((item, index) => (
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
                            <option key={p.sku} value={p.sku}>{p.name} (SKU: {p.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`item-quantity-${index}`}>Quantity</Label>
                      <Input id={`item-quantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`item-cost_price-${index}`}>Cost Price</Label>
                      <Input id={`item-cost_price-${index}`} type="number" value={item.cost_price} onChange={(e) => handleItemChange(index, 'cost_price', e.target.value)} />
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
              </>
            )}
            
            <div className="grid grid-cols-4 items-start gap-4 mt-4">
                <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                <Textarea id="notes" name="notes" value={currentPurchaseOrder?.notes || ''} onChange={handleInputChange} className="col-span-3" placeholder="Optional notes for the order..." disabled={isEditMode}/>
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddEditModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSavePurchaseOrder}>Save Purchase Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase order "{purchaseOrderToDelete?.po_number}". 
              Note: If this PO was already marked as 'Received', inventory will NOT be automatically reverted by this delete action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurchaseOrderToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePurchaseOrder} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* View Purchase Order Details Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Details: {purchaseOrderToView?.po_number}</DialogTitle>
          </DialogHeader>
          {purchaseOrderToView && (
            <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
              <p><strong>Supplier:</strong> {purchaseOrderToView.supplier_name}</p>
              <p><strong>Email:</strong> {purchaseOrderToView.supplier_email || 'N/A'}</p>
              <p><strong>Order Date:</strong> {new Date(purchaseOrderToView.order_date).toLocaleDateString()}</p>
              <p><strong>Expected Delivery:</strong> {purchaseOrderToView.expected_delivery_date ? new Date(purchaseOrderToView.expected_delivery_date).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Status:</strong> {purchaseOrderToView.status}</p>
              <p><strong>Total Amount:</strong> ${purchaseOrderToView.total_amount.toFixed(2)}</p>
              {purchaseOrderToView.notes && <p className="mt-2"><strong>Notes:</strong> {purchaseOrderToView.notes}</p>}
              <h4 className="font-semibold mt-3 mb-1">Items:</h4>
              <ul className="list-disc list-inside ml-4 text-sm">
                {purchaseOrderToView.items.map((item, index) => (
                  <li key={index}>
                    {item.product_name || item.sku} - Qty: {item.quantity}, Cost: ${item.cost_price.toFixed(2)}, Total: ${(item.quantity * item.cost_price).toFixed(2)}
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

      {purchases.length === 0 && !loading ? (
        <p>No purchase orders found. Click "Create New Purchase Order" to get started.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.po_id}>
                  <TableCell className="font-medium">{purchase.po_number}</TableCell>
                  <TableCell>{purchase.supplier_name}</TableCell>
                  <TableCell>{new Date(purchase.order_date).toLocaleDateString()}</TableCell>
                  <TableCell>{purchase.expected_delivery_date ? new Date(purchase.expected_delivery_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">${purchase.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <select 
                        value={purchase.status}
                        onChange={(e) => handleUpdateStatus(purchase.po_id!, e.target.value)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full border-0 focus:ring-0 appearance-none ${purchase.status === 'Received' ? 'bg-green-100 text-green-700' : purchase.status === 'Ordered' ? 'bg-blue-100 text-blue-700' : purchase.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                        <option value="Pending">Pending</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Received">Received</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="mr-1" onClick={() => openViewModal(purchase)} title="View Details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* <Button variant="ghost" size="icon" className="mr-1" onClick={() => openEditModal(purchase)} title="Edit PO (Status)">
                      <Edit className="h-4 w-4" />
                    </Button> */}
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => openDeleteConfirm(purchase)} title="Delete PO">
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

