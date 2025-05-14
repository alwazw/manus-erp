import psycopg2
import os
from psycopg2 import pool

# Initialize a connection pool
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

# It's better to initialize the pool once and reuse connections
# However, for simplicity in this service, we might open/close connections per call
# or pass a connection/cursor to methods. For now, let's try a simple pool.
# Note: In a real Flask app, you'd manage this pool more carefully, perhaps with app context.

try:
    # minconn=1, maxconn=5. Adjust as needed.
    db_pool = psycopg2.pool.SimpleConnectionPool(1, 10, dsn=DATABASE_URL)
except Exception as e:
    print(f"Error initializing database connection pool: {e}")
    db_pool = None # Set to None if initialization fails

class ProductService:
    def __init__(self):
        if db_pool is None:
            raise ConnectionError("Database connection pool is not available.")
        print("ProductService Initialized - Database connection pool ready.")

    def _get_connection(self):
        if db_pool is None:
            raise ConnectionError("Database connection pool is not available.")
        return db_pool.getconn()

    def _put_connection(self, conn):
        if db_pool is not None:
            db_pool.putconn(conn)

    def _execute_query(self, query, params=None, fetch_one=False, fetch_all=False, commit=False):
        conn = None
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute(query, params)
                if commit:
                    conn.commit()
                    return cur.rowcount # For INSERT/UPDATE/DELETE, return affected rows
                if fetch_one:
                    return cur.fetchone()
                if fetch_all:
                    return cur.fetchall()
        except Exception as e:
            if conn and not commit: # Rollback if not a commit operation that failed
                conn.rollback()
            print(f"Database query error: {e}")
            # In a real app, you might want to raise a custom DB exception
            raise # Re-raise the exception to be handled by the caller or a global error handler
        finally:
            if conn:
                self._put_connection(conn)

    def add_product(self, sku, name, category_name, inventory_level_status="In Stock", quantity=0, description=None, unit_price=0.0, average_cost=0.0, last_purchase_price=None):
        # First, get category_id from category_name (or create category if it doesn't exist - simplified for now)
        # For simplicity, assuming category_id is passed or handled elsewhere, or we use a default/lookup.
        # Here, we'll assume category_id is 1 for now or needs to be fetched/created.
        # This part needs proper implementation based on how categories are managed.
        
        # Simplified: Let's assume category_id is found or we use a placeholder
        # In a real app, you'd query the 'categories' table for category_id based on category_name
        # For now, let's assume a category_id is provided or we fetch it.
        # This example will directly insert into products and inventory_levels.
        
        # Get category_id (simplified - assumes category exists or is handled)
        category_id_result = self._execute_query("SELECT category_id FROM categories WHERE category_name = %s", (category_name,), fetch_one=True)
        if not category_id_result:
            # Create category if not exists (simplified)
            self._execute_query("INSERT INTO categories (category_name) VALUES (%s) RETURNING category_id", (category_name,), commit=True)
            category_id_result = self._execute_query("SELECT category_id FROM categories WHERE category_name = %s", (category_name,), fetch_one=True)
        
        category_id = category_id_result[0] if category_id_result else None
        if category_id is None:
            raise ValueError(f"Could not find or create category: {category_name}")

        sql_product = """
            INSERT INTO products (sku, product_name, description, category_id, unit_price, average_cost, last_purchase_price)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING product_id;
        """
        product_id_result = self._execute_query(sql_product, 
                                     (sku, name, description, category_id, unit_price, average_cost, last_purchase_price),
                                     fetch_one=True, commit=True) # Commit is handled by _execute_query
        
        if not product_id_result:
             raise Exception("Failed to add product and get product_id")
        product_id = product_id_result[0]

        sql_inventory = """
            INSERT INTO inventory_levels (product_id, available_quantity, inventory_level_status)
            VALUES (%s, %s, %s);
        """
        self._execute_query(sql_inventory, (product_id, quantity, inventory_level_status), commit=True)
        
        # Return the newly created product details (or a success message)
        # Fetching the full product might be good here
        return self.get_product_by_sku(sku)

    def get_all_products(self):
        # Joins products with inventory_levels and categories for a complete view
        sql = """
            SELECT 
                p.product_id, p.sku, p.product_name, p.description, 
                c.category_name, p.unit_price, p.average_cost, p.last_purchase_price,
                il.available_quantity, il.inventory_level_status, il.reorder_point,
                p.created_at, p.updated_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN inventory_levels il ON p.product_id = il.product_id
            ORDER BY p.product_name;
        """
        rows = self._execute_query(sql, fetch_all=True)
        products = []
        if rows:
            for row in rows:
                products.append({
                    "product_id": row[0],
                    "sku": row[1],
                    "name": row[2],
                    "description": row[3],
                    "category": row[4], # category_name
                    "unit_price": float(row[5]) if row[5] is not None else None,
                    "average_cost": float(row[6]) if row[6] is not None else None,
                    "last_purchase_price": float(row[7]) if row[7] is not None else None,
                    "quantity": row[8],
                    "inventory_level_status": row[9],
                    "reorder_point": row[10],
                    "created_at": row[11].isoformat() if row[11] else None,
                    "updated_at": row[12].isoformat() if row[12] else None
                })
        return products

    def get_product_by_sku(self, sku):
        sql = """
            SELECT 
                p.product_id, p.sku, p.product_name, p.description, 
                c.category_name, p.unit_price, p.average_cost, p.last_purchase_price,
                il.available_quantity, il.inventory_level_status, il.reorder_point,
                p.created_at, p.updated_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN inventory_levels il ON p.product_id = il.product_id
            WHERE p.sku = %s;
        """
        row = self._execute_query(sql, (sku,), fetch_one=True)
        if row:
            return {
                "product_id": row[0],
                "sku": row[1],
                "name": row[2],
                "description": row[3],
                "category": row[4],
                "unit_price": float(row[5]) if row[5] is not None else None,
                "average_cost": float(row[6]) if row[6] is not None else None,
                "last_purchase_price": float(row[7]) if row[7] is not None else None,
                "quantity": row[8],
                "inventory_level_status": row[9],
                "reorder_point": row[10],
                "created_at": row[11].isoformat() if row[11] else None,
                "updated_at": row[12].isoformat() if row[12] else None
            }
        return None

    def update_product(self, sku, update_data):
        # This method needs to handle updates to 'products' and 'inventory_levels' tables
        # And potentially 'categories' if category_name is part of update_data
        
        # Fetch current product_id
        product_info = self.get_product_by_sku(sku)
        if not product_info:
            return None # Product not found
        product_id = product_info["product_id"]

        # Product table updates
        product_fields = ["product_name", "description", "unit_price", "average_cost", "last_purchase_price"]
        product_updates = {k: v for k, v in update_data.items() if k in product_fields and v is not None}
        
        if "category" in update_data and update_data["category"] is not None:
            category_name = update_data["category"]
            category_id_result = self._execute_query("SELECT category_id FROM categories WHERE category_name = %s", (category_name,), fetch_one=True)
            if not category_id_result:
                self._execute_query("INSERT INTO categories (category_name) VALUES (%s) RETURNING category_id", (category_name,), commit=True)
                category_id_result = self._execute_query("SELECT category_id FROM categories WHERE category_name = %s", (category_name,), fetch_one=True)
            category_id = category_id_result[0] if category_id_result else None
            if category_id:
                product_updates["category_id"] = category_id

        if product_updates:
            set_clauses = ", ".join([f"{key} = %s" for key in product_updates.keys()])
            params = list(product_updates.values()) + [sku]
            self._execute_query(f"UPDATE products SET {set_clauses}, updated_at = CURRENT_TIMESTAMP WHERE sku = %s", tuple(params), commit=True)

        # Inventory table updates
        inventory_fields = ["available_quantity", "inventory_level_status", "reorder_point"]
        inventory_updates = {k: v for k, v in update_data.items() if k in inventory_fields and v is not None}
        # Rename 'quantity' from frontend to 'available_quantity' for db
        if 'quantity' in inventory_updates:
            inventory_updates['available_quantity'] = inventory_updates.pop('quantity')
            
        if inventory_updates:
            set_clauses_inv = ", ".join([f"{key} = %s" for key in inventory_updates.keys()])
            params_inv = list(inventory_updates.values()) + [product_id]
            self._execute_query(f"UPDATE inventory_levels SET {set_clauses_inv}, last_updated = CURRENT_TIMESTAMP WHERE product_id = %s", tuple(params_inv), commit=True)
        
        return self.get_product_by_sku(sku) # Return updated product info

    def delete_product(self, sku):
        # Need to delete from inventory_levels first due to foreign key, or use CASCADE DELETE in DB schema
        # Assuming no CASCADE DELETE for now, so explicit deletion order.
        product_info = self.get_product_by_sku(sku)
        if not product_info:
            return False # Product not found
        product_id = product_info["product_id"]

        self._execute_query("DELETE FROM inventory_levels WHERE product_id = %s", (product_id,), commit=True)
        deleted_rows = self._execute_query("DELETE FROM products WHERE sku = %s", (sku,), commit=True)
        return deleted_rows > 0

# The Product, Category, InventoryLevel classes are more like data models/DTOs.
# They are not directly used by the service methods above in their current form but could be.
# For now, the service methods return dictionaries.

# print("Product Management Module (product_service.py) Loaded with DB integration")

