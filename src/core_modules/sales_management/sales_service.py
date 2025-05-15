# Sales Management Module - Integrated with PostgreSQL

import psycopg2
import os
import logging # Import logging
from psycopg2 import pool
from datetime import datetime

# Configure logger for this module
logger = logging.getLogger(__name__)

# Initialize a connection pool
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable is not set for SalesService.")
    raise RuntimeError("DATABASE_URL environment variable is not set.")

try:
    db_pool = psycopg2.pool.SimpleConnectionPool(1, 10, dsn=DATABASE_URL)
    logger.info("Database connection pool initialized successfully for SalesService.")
except Exception as e:
    logger.critical(f"Error initializing database connection pool in SalesService: {e}", exc_info=True)
    db_pool = None

class SalesService:
    def __init__(self):
        if db_pool is None:
            logger.error("SalesService initialized but database connection pool is not available.")
            raise ConnectionError("Database connection pool is not available for SalesService.")
        logger.info("SalesService Initialized - Database connection pool ready.")

    def _get_connection(self):
        if db_pool is None:
            logger.error("Attempted to get DB connection for SalesService, but pool is not available.")
            raise ConnectionError("Database connection pool is not available.")
        return db_pool.getconn()

    def _put_connection(self, conn):
        if db_pool is not None:
            db_pool.putconn(conn)

    def _execute_query(self, query, params=None, fetch_one=False, fetch_all=False, commit=False):
        conn = None
        logger.debug(f"SalesService executing query: {query} with params: {params}")
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute(query, params)
                if commit:
                    conn.commit()
                    logger.info(f"SalesService query committed. {cur.rowcount} rows affected.")
                    if "RETURNING" in query.upper() and (fetch_one or fetch_all):
                        if fetch_one:
                            result = cur.fetchone()
                            logger.debug(f"SalesService query (commit with returning) fetch_one result: {result}")
                            return result
                        else:
                            results = cur.fetchall()
                            logger.debug(f"SalesService query (commit with returning) fetch_all results count: {len(results) if results else 0}")
                            return results
                    return cur.rowcount
                if fetch_one:
                    result = cur.fetchone()
                    logger.debug(f"SalesService query fetch_one result: {result}")
                    return result
                if fetch_all:
                    results = cur.fetchall()
                    logger.debug(f"SalesService query fetch_all results count: {len(results) if results else 0}")
                    return results
        except Exception as e:
            logger.error(f"SalesService Database query error: {e} for query: {query} with params: {params}", exc_info=True)
            if conn and not commit:
                try:
                    conn.rollback()
                    logger.info("SalesService transaction rolled back due to error.")
                except Exception as rb_e:
                    logger.error(f"SalesService error during rollback: {rb_e}", exc_info=True)
            raise
        finally:
            if conn:
                self._put_connection(conn)

    def _get_or_create_customer(self, customer_name, email=None, phone=None, address_details=None):
        logger.info(f"Getting or creating customer: {customer_name}, email: {email}")
        sql_find_customer = "SELECT customer_id FROM customers WHERE customer_name = %s OR (email IS NOT NULL AND email = %s) LIMIT 1"
        customer_row = self._execute_query(sql_find_customer, (customer_name, email), fetch_one=True)
        if customer_row:
            logger.info(f"Found existing customer_id: {customer_row[0]} for name: {customer_name}")
            return customer_row[0]
        else:
            logger.info(f"Creating new customer: {customer_name}")
            sql_create_customer = """
                INSERT INTO customers (customer_name, email, phone, address_line1, city, country)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING customer_id;
            """
            addr = address_details or {}
            new_customer_id_row = self._execute_query(sql_create_customer, (
                customer_name, email, phone, 
                addr.get("address_line1"), addr.get("city"), addr.get("country")
            ), commit=True, fetch_one=True)
            if new_customer_id_row:
                logger.info(f"Created new customer_id: {new_customer_id_row[0]} for name: {customer_name}")
                return new_customer_id_row[0]
            else:
                logger.error(f"Failed to create or retrieve customer: {customer_name}")
                raise Exception("Failed to create or retrieve customer")

    def record_sale(self, customer_name, items, order_date_str, status="Pending", customer_email=None, customer_phone=None, shipping_address=None):
        logger.info(f"Attempting to record sale for customer: {customer_name}, items_count: {len(items) if items else 0}, order_date: {order_date_str}")
        if not customer_name or not items or not order_date_str:
            logger.warning("Record sale attempt with missing customer_name, items, or order_date.")
            return {"error": "Missing customer name, items, or order date"}

        try:
            customer_id = self._get_or_create_customer(customer_name, customer_email, customer_phone, shipping_address)
            
            try:
                order_date = datetime.fromisoformat(order_date_str.replace("Z", "+00:00")) if isinstance(order_date_str, str) else order_date_str
            except ValueError as ve:
                logger.warning(f"Invalid order_date format: {order_date_str}. Error: {ve}")
                return {"error": "Invalid order_date format. Use ISO format."}

            total_amount = 0
            processed_items = []
            for item_idx, item_data in enumerate(items):
                logger.debug(f"Processing sale item {item_idx + 1}: SKU {item_data.get('sku')}")
                product_info = self._execute_query("SELECT product_id, unit_price, available_quantity FROM products p JOIN inventory_levels il ON p.product_id = il.product_id WHERE sku = %s", (item_data["sku"],), fetch_one=True)
                if not product_info:
                    logger.error(f"Product with SKU {item_data['sku']} not found during sale recording.")
                    return {"error": f"Product with SKU {item_data['sku']} not found."}
                
                # Check stock
                available_quantity = product_info[2]
                if item_data["quantity"] > available_quantity:
                    logger.error(f"Insufficient stock for SKU {item_data['sku']}. Requested: {item_data['quantity']}, Available: {available_quantity}")
                    return {"error": f"Insufficient stock for SKU {item_data['sku']}. Available: {available_quantity}"}

                item_price = item_data.get("price", float(product_info[1])) 
                total_amount += item_data["quantity"] * item_price
                processed_items.append({
                    "product_id": product_info[0],
                    "sku": item_data["sku"],
                    "quantity": item_data["quantity"],
                    "unit_price_at_sale": item_price
                })
            logger.debug(f"Calculated total_amount: {total_amount} for the sale.")

            order_number_prefix = datetime.now().strftime("%Y%m%d%H%M%S")
            last_id_row = self._execute_query("SELECT MAX(order_id) FROM sales_orders", fetch_one=True)
            next_id = (last_id_row[0] if last_id_row and last_id_row[0] is not None else 0) + 1
            order_number = f"SO-{order_number_prefix}-{next_id}"
            logger.info(f"Generated order_number: {order_number}")

            sql_insert_order = """
                INSERT INTO sales_orders (order_number, customer_id, order_date, total_amount, status, 
                                        shipping_address_line1, shipping_city, shipping_country)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING order_id;
            """
            sa = shipping_address or {}
            order_id_row = self._execute_query(sql_insert_order, (
                order_number, customer_id, order_date, total_amount, status,
                sa.get("address_line1"), sa.get("city"), sa.get("country")
            ), commit=True, fetch_one=True)

            if not order_id_row:
                logger.error("Failed to create sales order after generating order_number.")
                raise Exception("Failed to create sales order.")
            order_id = order_id_row[0]
            logger.info(f"Sales order created with order_id: {order_id}")

            for item in processed_items:
                sql_insert_item = """
                    INSERT INTO sales_order_items (order_id, product_id, sku, quantity, unit_price, line_total)
                    VALUES (%s, %s, %s, %s, %s, %s);
                """
                line_total = item["quantity"] * item["unit_price_at_sale"]
                self._execute_query(sql_insert_item, (
                    order_id, item["product_id"], item["sku"], item["quantity"], item["unit_price_at_sale"], line_total
                ), commit=True)
                logger.debug(f"Inserted sales_order_item for order_id {order_id}, product_id {item['product_id']}")

                sql_update_inventory = """
                    UPDATE inventory_levels 
                    SET available_quantity = available_quantity - %s 
                    WHERE product_id = %s;
                """
                self._execute_query(sql_update_inventory, (item["quantity"], item["product_id"]), commit=True)
                logger.info(f"Inventory updated for product_id {item['product_id']} (SKU: {item['sku']}), quantity reduced by {item['quantity']}")

            return self.get_sale_by_id(order_id)
        except Exception as e:
            logger.error(f"Error in record_sale for customer {customer_name}: {str(e)}", exc_info=True)
            # Ensure a dictionary with an error key is returned for consistency if an unhandled exception occurs
            return {"error": f"An unexpected error occurred: {str(e)}"}

    def get_all_sales(self):
        logger.info("Fetching all sales orders.")
        sql = """
            SELECT 
                so.order_id, so.order_number, c.customer_name, so.order_date, 
                so.total_amount, so.status,
                so.shipping_address_line1, so.shipping_city, so.shipping_country
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.customer_id
            ORDER BY so.order_date DESC;
        """
        try:
            rows = self._execute_query(sql, fetch_all=True)
            orders = []
            if rows:
                for row in rows:
                    orders.append({
                        "order_id": row[0],
                        "order_number": row[1],
                        "customer_name": row[2],
                        "order_date": row[3].isoformat() if row[3] else None,
                        "total_amount": float(row[4]) if row[4] is not None else None,
                        "status": row[5],
                        "shipping_address_line1": row[6],
                        "shipping_city": row[7],
                        "shipping_country": row[8],
                    })
            logger.info(f"Retrieved {len(orders)} sales orders.")
            return orders
        except Exception as e:
            logger.error(f"Error in get_all_sales: {str(e)}", exc_info=True)
            raise

    def get_sale_by_id(self, order_id):
        logger.info(f"Fetching sale by order_id: {order_id}")
        sql_order = """
            SELECT 
                so.order_id, so.order_number, c.customer_name, c.email as customer_email, so.order_date, 
                so.total_amount, so.status,
                so.shipping_address_line1, so.shipping_address_line2, so.shipping_city, 
                so.shipping_state_province, so.shipping_postal_code, so.shipping_country, so.notes
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.customer_id
            WHERE so.order_id = %s;
        """
        try:
            order_row = self._execute_query(sql_order, (order_id,), fetch_one=True)
            if not order_row:
                logger.warning(f"Sale not found for order_id: {order_id}")
                return None

            order_details = {
                "order_id": order_row[0],
                "order_number": order_row[1],
                "customer_name": order_row[2],
                "customer_email": order_row[3],
                "order_date": order_row[4].isoformat() if order_row[4] else None,
                "total_amount": float(order_row[5]) if order_row[5] is not None else None,
                "status": order_row[6],
                "shipping_address": {
                    "line1": order_row[7],
                    "line2": order_row[8],
                    "city": order_row[9],
                    "state_province": order_row[10],
                    "postal_code": order_row[11],
                    "country": order_row[12]
                },
                "notes": order_row[13],
                "items": []
            }

            sql_items = """
                SELECT soi.order_item_id, soi.product_id, p.product_name, soi.sku, 
                       soi.quantity, soi.unit_price, soi.line_total
                FROM sales_order_items soi
                JOIN products p ON soi.product_id = p.product_id
                WHERE soi.order_id = %s;
            """
            item_rows = self._execute_query(sql_items, (order_id,), fetch_all=True)
            if item_rows:
                for item_row in item_rows:
                    order_details["items"].append({
                        "order_item_id": item_row[0],
                        "product_id": item_row[1],
                        "product_name": item_row[2],
                        "sku": item_row[3],
                        "quantity": item_row[4],
                        "unit_price": float(item_row[5]) if item_row[5] is not None else None,
                        "line_total": float(item_row[6]) if item_row[6] is not None else None
                    })
            logger.info(f"Successfully retrieved sale details for order_id: {order_id}")
            return order_details
        except Exception as e:
            logger.error(f"Error in get_sale_by_id for order_id {order_id}: {str(e)}", exc_info=True)
            raise

    def update_sale_status(self, order_id, new_status):
        logger.info(f"Attempting to update status for sale order_id: {order_id} to {new_status}")
        sql = "UPDATE sales_orders SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE order_id = %s RETURNING order_id;"
        try:
            updated_row = self._execute_query(sql, (new_status, order_id), commit=True, fetch_one=True)
            if updated_row:
                logger.info(f"Sale order_id: {order_id} status updated to {new_status}")
                return self.get_sale_by_id(order_id)
            logger.warning(f"Failed to update status for sale order_id: {order_id} (not found or no change)")
            return None
        except Exception as e:
            logger.error(f"Error in update_sale_status for order_id {order_id}: {str(e)}", exc_info=True)
            raise

    def delete_sale(self, order_id):
        logger.info(f"Attempting to delete sale order_id: {order_id}")
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                sale_info = self.get_sale_by_id(order_id) # Uses its own logging
                if not sale_info:
                    logger.warning(f"Delete failed: Sale not found for order_id: {order_id}")
                    return False

                logger.info(f"Reverting inventory for items in deleted sale order_id: {order_id}")
                for item in sale_info.get("items", []):
                    sql_revert_inventory = """
                        UPDATE inventory_levels 
                        SET available_quantity = available_quantity + %s 
                        WHERE product_id = %s;
                    """
                    cur.execute(sql_revert_inventory, (item["quantity"], item["product_id"]))
                    logger.debug(f"Inventory reverted for product_id {item['product_id']} by quantity {item['quantity']}")

                cur.execute("DELETE FROM sales_order_items WHERE order_id = %s", (order_id,))
                logger.info(f"Deleted sales_order_items for order_id: {order_id}")
                cur.execute("DELETE FROM sales_orders WHERE order_id = %s", (order_id,))
                logger.info(f"Deleted sales_order for order_id: {order_id}")
                conn.commit()
                logger.info(f"Sale order_id: {order_id} and its items deleted successfully, inventory reverted.")
                return True
        except Exception as e:
            logger.error(f"Error deleting sale {order_id}: {str(e)}", exc_info=True)
            if conn:
                conn.rollback()
                logger.info(f"Transaction rolled back for delete_sale order_id: {order_id}")
            raise
        finally:
            if conn:
                self._put_connection(conn)
        return False # Should not be reached if exception is raised

logger.info("Sales Management Module (sales_service.py) Loaded with DB integration and logging.")

