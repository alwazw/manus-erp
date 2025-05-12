# Sales Management Module
# Placeholder for sales data and operations

class SalesService:
    def __init__(self):
        self.sales_orders = [
            {"order_id": "SALE001", "customer_name": "Alice Wonderland", "items": [{"sku": "SKU001", "quantity": 1, "price": 1200.00}], "total_amount": 1200.00, "status": "Completed", "order_date": "2025-05-10"},
            {"order_id": "SALE002", "customer_name": "Bob The Builder", "items": [{"sku": "SKU002", "quantity": 2, "price": 25.00}], "total_amount": 50.00, "status": "Pending", "order_date": "2025-05-11"},
        ]
        self.next_order_id = 3

    def _generate_order_id(self):
        order_id = f"SALE{self.next_order_id:03d}"
        self.next_order_id += 1
        return order_id

    def record_sale(self, customer_name, items, order_date, status="Pending"):
        # Basic validation
        if not customer_name or not items or not order_date:
            return {"error": "Missing customer name, items, or order date"}
        
        total_amount = sum(item.get("quantity", 0) * item.get("price", 0) for item in items)
        
        new_order = {
            "order_id": self._generate_order_id(),
            "customer_name": customer_name,
            "items": items, # Example: [{"sku": "SKU001", "quantity": 1, "price": 1200.00}]
            "total_amount": total_amount,
            "status": status,
            "order_date": order_date
        }
        self.sales_orders.append(new_order)
        # In a real system, this would also update product inventory based on SKUs in items
        # For example, by calling a product_service.decrease_inventory(sku, quantity) method
        return new_order

    def get_all_sales(self):
        return self.sales_orders

    def get_sale_by_id(self, order_id):
        for order in self.sales_orders:
            if order["order_id"] == order_id:
                return order
        return None

    def update_sale_status(self, order_id, new_status):
        order = self.get_sale_by_id(order_id)
        if order:
            order["status"] = new_status
            return order
        return None

    def delete_sale(self, order_id):
        initial_len = len(self.sales_orders)
        self.sales_orders = [o for o in self.sales_orders if o["order_id"] != order_id]
        return len(self.sales_orders) < initial_len

print("Sales Management Module - Placeholder Service Loaded")

