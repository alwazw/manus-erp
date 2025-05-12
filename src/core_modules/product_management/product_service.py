# Product Management Module

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

# Placeholder for database interaction functions (CRUD operations)
# These would typically interact with a PostgreSQL database

def add_product(product_data):
    # Logic to add a new product to the database
    print(f"Adding product: {product_data.product_name}")
    # Example: INSERT INTO products (...) VALUES (...)
    return product_data # Or return the created product object with ID

def get_product_by_sku(sku):
    # Logic to retrieve a product by SKU
    print(f"Fetching product with SKU: {sku}")
    # Example: SELECT * FROM products WHERE sku = ...
    return None # Placeholder

def update_product(sku, updated_data):
    # Logic to update an existing product
    print(f"Updating product with SKU: {sku}")
    # Example: UPDATE products SET ... WHERE sku = ...
    return True # Placeholder

def delete_product(sku):
    # Logic to delete a product
    print(f"Deleting product with SKU: {sku}")
    # Example: DELETE FROM products WHERE sku = ...
    return True # Placeholder

# Similar functions for Category and InventoryLevel

print("Product Management Module Loaded")

