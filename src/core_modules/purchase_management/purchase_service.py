# Purchase Management Module
# Placeholder for purchase data and operations

class PurchaseService:
    def __init__(self):
        self.purchase_orders = [
            {"purchase_id": "PUR001", "supplier_name": "Supplier Alpha", "items": [{"sku": "SKU001", "quantity": 10, "cost_price": 800.00}], "total_amount": 8000.00, "status": "Received", "order_date": "2025-05-01"},
            {"purchase_id": "PUR002", "supplier_name": "Supplier Beta", "items": [{"sku": "SKU002", "quantity": 50, "cost_price": 15.00}], "total_amount": 750.00, "status": "Ordered", "order_date": "2025-05-05"},
        ]
        self.next_purchase_id = 3

    def _generate_purchase_id(self):
        purchase_id = f"PUR{self.next_purchase_id:03d}"
        self.next_purchase_id += 1
        return purchase_id

    def record_purchase(self, supplier_name, items, order_date, status="Ordered"):
        # Basic validation
        if not supplier_name or not items or not order_date:
            return {"error": "Missing supplier name, items, or order date"}
        
        total_amount = sum(item.get("quantity", 0) * item.get("cost_price", 0) for item in items)
        
        new_purchase_order = {
            "purchase_id": self._generate_purchase_id(),
            "supplier_name": supplier_name,
            "items": items, # Example: [{"sku": "SKU001", "quantity": 10, "cost_price": 800.00}]
            "total_amount": total_amount,
            "status": status,
            "order_date": order_date
        }
        self.purchase_orders.append(new_purchase_order)
        # In a real system, this would also update product inventory upon receiving items
        # For example, by calling a product_service.increase_inventory(sku, quantity) method when status is "Received"
        return new_purchase_order

    def get_all_purchases(self):
        return self.purchase_orders

    def get_purchase_by_id(self, purchase_id):
        for order in self.purchase_orders:
            if order["purchase_id"] == purchase_id:
                return order
        return None

    def update_purchase_status(self, purchase_id, new_status):
        order = self.get_purchase_by_id(purchase_id)
        if order:
            order["status"] = new_status
            # Potentially trigger inventory update if status changes to "Received"
            # if new_status == "Received":
            #     for item in order["items"]:
            #         product_service.increase_inventory(item["sku"], item["quantity"])
            return order
        return None

    def delete_purchase(self, purchase_id):
        initial_len = len(self.purchase_orders)
        self.purchase_orders = [po for po in self.purchase_orders if po["purchase_id"] != purchase_id]
        return len(self.purchase_orders) < initial_len

print("Purchase Management Module - Placeholder Service Loaded")

