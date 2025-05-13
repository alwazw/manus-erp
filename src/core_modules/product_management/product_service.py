# Product Management Module

class ProductService:
    def __init__(self):
        # In a real application, this would initialize database connections, etc.
        self.products_db = {} # Using a simple dictionary as a placeholder for a database
        self.next_product_id = 1
        print("ProductService Initialized")

    def add_product(self, sku, name, category, inventory_level_status="In Stock", quantity=0):
        # Logic to add a new product to the database
        if sku in self.products_db:
            # This is a simplified error handling. In a real app, might raise an exception or return a more detailed error.
            return {"error": f"Product with SKU {sku} already exists."}
        
        new_product = {
            "sku": sku,
            "name": name,
            "category": category,
            "inventory_level_status": inventory_level_status,
            "quantity": quantity
        }
        self.products_db[sku] = new_product
        print(f"Adding product: {name} (SKU: {sku})")
        return new_product

    def get_all_products(self):
        print("Fetching all products")
        return list(self.products_db.values())

    def get_product_by_sku(self, sku):
        # Logic to retrieve a product by SKU
        print(f"Fetching product with SKU: {sku}")
        return self.products_db.get(sku) # Returns None if SKU not found

    def update_product(self, sku, updated_data):
        # Logic to update an existing product
        if sku not in self.products_db:
            return None # Or raise an error
        
        product_to_update = self.products_db[sku]
        for key, value in updated_data.items():
            if key in product_to_update:
                product_to_update[key] = value
        
        self.products_db[sku] = product_to_update
        print(f"Updating product with SKU: {sku}")
        return product_to_update

    def delete_product(self, sku):
        # Logic to delete a product
        if sku in self.products_db:
            del self.products_db[sku]
            print(f"Deleting product with SKU: {sku}")
            return True
        return False

# The following classes are data structures and can remain as they are, 
# or be moved/adjusted based on broader architectural decisions later.
class Product:
    def __init__(self, sku, product_name, category_id, unit_price, description=None, average_cost=0.0, last_purchase_price=None):
        self.sku = sku
        self.product_name = product_name
        self.description = description
        self.category_id = category_id
        self.unit_price = unit_price
        self.average_cost = average_cost
        self.last_purchase_price = last_purchase_price

    def __str__(self):
        return f"Product(SKU: {self.sku}, Name: {self.product_name})"

class Category:
    def __init__(self, category_id, category_name, description=None):
        self.category_id = category_id
        self.category_name = category_name
        self.description = description

    def __str__(self):
        return f"Category(ID: {self.category_id}, Name: {self.category_name})"

class InventoryLevel:
    def __init__(self, product_id, available_quantity, inventory_level_status, reorder_point=0):
        self.product_id = product_id
        self.available_quantity = available_quantity
        self.inventory_level_status = inventory_level_status # "In Stock", "Low Stock", "Out of Stock"
        self.reorder_point = reorder_point

    def __str__(self):
        return f"Inventory(Product ID: {self.product_id}, Quantity: {self.available_quantity}, Status: {self.inventory_level_status})"

# Removed the standalone functions as they are now methods of ProductService

# The print statement below was in the original file. 
# It might be useful for debugging module loading but can be removed if ProductService is initialized in app.py.
# print("Product Management Module (product_service.py) Loaded")

