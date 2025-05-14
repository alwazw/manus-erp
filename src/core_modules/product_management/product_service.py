import psycopg2
import os
import logging # Import logging
from psycopg2 import pool

# Configure logger for this module
logger = logging.getLogger(__name__)

# Initialize a connection pool
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable is not set.")
    raise RuntimeError("DATABASE_URL environment variable is not set.")

try:
    db_pool = psycopg2.pool.SimpleConnectionPool(1, 10, dsn=DATABASE_URL)
    logger.info("Database connection pool initialized successfully.")
except Exception as e:
    logger.critical(f"Error initializing database connection pool: {e}", exc_info=True)
    db_pool = None

class ProductService:
    def __init__(self):
        if db_pool is None:
            logger.error("ProductService initialized but database connection pool is not available.")
            raise ConnectionError("Database connection pool is not available.")
        logger.info("ProductService Initialized - Database connection pool ready.")

    def _get_connection(self):
        if db_pool is None:
            logger.error("Attempted to get DB connection, but pool is not available.")
            raise ConnectionError("Database connection pool is not available.")
        return db_pool.getconn()

    def _put_connection(self, conn):
        if db_pool is not None:
            db_pool.putconn(conn)

    def _execute_query(self, query, params=None, fetch_one=False, fetch_all=False, commit=False):
        conn = None
        logger.debug(f"Executing query: {query} with params: {params}")
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute(query, params)
                if commit:
                    conn.commit()
                    logger.info(f"Query committed. {cur.rowcount} rows affected.")
                    return cur.rowcount
                if fetch_one:
                    result = cur.fetchone()
                    logger.debug(f"Query fetch_one result: {result}")
                    return result
                if fetch_all:
                    results = cur.fetchall()
                    logger.debug(f"Query fetch_all results count: {len(results) if results else 0}")
                    return results
        except Exception as e:
            logger.error(f"Database query error: {e} for query: {query} with params: {params}", exc_info=True)
            if conn and not commit: 
                try:
                    conn.rollback()
                    logger.info("Transaction rolled back due to error.")
                except Exception as rb_e:
                    logger.error(f"Error during rollback: {rb_e}", exc_info=True)
            raise 
        finally:
            if conn:
                self._put_connection(conn)

    def add_product(self, sku, name, category_name, inventory_level_status="In Stock", quantity=0, description=None, unit_price=0.0, average_cost=0.0, last_purchase_price=None):
        logger.info(f"Attempting to add product with SKU: {sku}, Name: {name}, Category: {category_name}")
        try:
            category_id_result = self._execute_query("SELECT category_id FROM categories WHERE category_name = %s", (category_name,), fetch_one=True)
            if not category_id_result:
                logger.info(f"Category 	{category_name}	 not found, creating new one.")
                self._execute_query("INSERT INTO categories (category_name) VALUES (%s) RETURNING category_id", (category_name,), commit=True)
                category_id_result = self._execute_query("SELECT category_id FROM categories WHERE category_name = %s", (category_name,), fetch_one=True)
            
            category_id = category_id_result[0] if category_id_result else None
            if category_id is None:
                logger.error(f"Could not find or create category: {category_name} for product SKU: {sku}")
                raise ValueError(f"Could not find or create category: {category_name}")
            logger.debug(f"Using category_id: {category_id} for product SKU: {sku}")

            sql_product = """
                INSERT INTO products (sku, product_name, description, category_id, unit_price, average_cost, last_purchase_price)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING product_id;
            """
            product_id_result = self._execute_query(sql_product, 
                                         (sku, name, description, category_id, unit_price, average_cost, last_purchase_price),
                                         fetch_one=True, commit=True)
            
            if not product_id_result:
                 logger.error(f"Failed to add product {sku} and get product_id")
                 raise Exception("Failed to add product and get product_id")
            product_id = product_id_result[0]
            logger.info(f"Product {sku} added with product_id: {product_id}")

            sql_inventory = """
                INSERT INTO inventory_levels (product_id, available_quantity, inventory_level_status)
                VALUES (%s, %s, %s);
            """
            self._execute_query(sql_inventory, (product_id, quantity, inventory_level_status), commit=True)
            logger.info(f"Inventory level for product_id {product_id} (SKU: {sku}) set to quantity: {quantity}, status: {inventory_level_status}")
            
            return self.get_product_by_sku(sku)
        except Exception as e:
            logger.error(f"Error in add_product for SKU {sku}: {str(e)}", exc_info=True)
            raise

    def get_all_products(self):
        logger.info("Fetching all products.")
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
        try:
            rows = self._execute_query(sql, fetch_all=True)
            products = []
            if rows:
                for row in rows:
                    products.append({
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
                    })
            logger.info(f"Retrieved {len(products)} products.")
            return products
        except Exception as e:
            logger.error(f"Error in get_all_products: {str(e)}", exc_info=True)
            raise

    def get_product_by_sku(self, sku):
        logger.info(f"Fetching product by SKU: {sku}")
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
        try:
            row = self._execute_query(sql, (sku,), fetch_one=True)
            if row:
                logger.info(f"Product found for SKU: {sku}")
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
            logger.warning(f"Product not found for SKU: {sku}")
            return None
        except Exception as e:
            logger.error(f"Error in get_product_by_sku for SKU {sku}: {str(e)}", exc_info=True)
            raise

    def update_product(self, sku, update_data):
        logger.info(f"Attempting to update product with SKU: {sku}. Data: {update_data}")
        try:
            product_info = self.get_product_by_sku(sku) # Uses its own logging
            if not product_info:
                logger.warning(f"Update failed: Product not found for SKU: {sku}")
                return None
            product_id = product_info["product_id"]

            product_fields = ["product_name", "description", "unit_price", "average_cost", "last_purchase_price"]
            product_updates = {k: v for k, v in update_data.items() if k in product_fields and v is not None}
            
            if "category" in update_data and update_data["category"] is not None:
                category_name = update_data["category"]
                logger.debug(f"Updating category to {category_name} for SKU {sku}")
                category_id_result = self._execute_query("SELECT category_id FROM categories WHERE category_name = %s", (category_name,), fetch_one=True)
                if not category_id_result:
                    logger.info(f"Category {category_name} not found, creating for product update.")
                    self._execute_query("INSERT INTO categories (category_name) VALUES (%s) RETURNING category_id", (category_name,), commit=True)
                    category_id_result = self._execute_query("SELECT category_id FROM categories WHERE category_name = %s", (category_name,), fetch_one=True)
                category_id = category_id_result[0] if category_id_result else None
                if category_id:
                    product_updates["category_id"] = category_id
                    logger.debug(f"Category ID for {category_name} is {category_id}")

            if product_updates:
                set_clauses = ", ".join([f"{key} = %s" for key in product_updates.keys()])
                params = list(product_updates.values()) + [sku]
                self._execute_query(f"UPDATE products SET {set_clauses}, updated_at = CURRENT_TIMESTAMP WHERE sku = %s", tuple(params), commit=True)
                logger.info(f"Product table updated for SKU: {sku}")

            inventory_fields = ["available_quantity", "inventory_level_status", "reorder_point"]
            inventory_updates = {k: v for k, v in update_data.items() if k in inventory_fields and v is not None}
            if 'quantity' in update_data and update_data["quantity"] is not None: # Handle frontend sending 'quantity'
                inventory_updates['available_quantity'] = update_data['quantity']
            
            if inventory_updates:
                set_clauses_inv = ", ".join([f"{key} = %s" for key in inventory_updates.keys()])
                params_inv = list(inventory_updates.values()) + [product_id]
                self._execute_query(f"UPDATE inventory_levels SET {set_clauses_inv}, last_updated = CURRENT_TIMESTAMP WHERE product_id = %s", tuple(params_inv), commit=True)
                logger.info(f"Inventory levels updated for product_id: {product_id} (SKU: {sku})")
            
            return self.get_product_by_sku(sku)
        except Exception as e:
            logger.error(f"Error in update_product for SKU {sku}: {str(e)}", exc_info=True)
            raise

    def delete_product(self, sku):
        logger.info(f"Attempting to delete product with SKU: {sku}")
        try:
            product_info = self.get_product_by_sku(sku)
            if not product_info:
                logger.warning(f"Delete failed: Product not found for SKU: {sku}")
                return False
            product_id = product_info["product_id"]

            self._execute_query("DELETE FROM inventory_levels WHERE product_id = %s", (product_id,), commit=True)
            logger.info(f"Inventory levels deleted for product_id: {product_id} (SKU: {sku})")
            deleted_rows = self._execute_query("DELETE FROM products WHERE sku = %s", (sku,), commit=True)
            if deleted_rows > 0:
                logger.info(f"Product {sku} (product_id: {product_id}) deleted successfully.")
                return True
            else:
                logger.warning(f"Product {sku} (product_id: {product_id}) was not found in products table for deletion, though inventory might have been deleted.")
                return False # Should ideally not happen if get_product_by_sku found it
        except Exception as e:
            logger.error(f"Error in delete_product for SKU {sku}: {str(e)}", exc_info=True)
            raise

logger.info("Product Management Module (product_service.py) Loaded with DB integration and logging.")

