# Sales Management Module - Integrated with PostgreSQL

import psycopg2
import os
from psycopg2 import pool
from datetime import datetime

# Initialize a connection pool
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

try:
    db_pool = psycopg2.pool.SimpleConnectionPool(1, 10, dsn=DATABASE_URL)
except Exception as e:
    print(f"Error initializing database connection pool in SalesService: {e}")
    db_pool = None

class SalesService:
    def __init__(self):
        if db_pool is None:
            raise ConnectionError("Database connection pool is not available for SalesService.")
        print("SalesService Initialized - Database connection pool ready.")

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
                    # For INSERT RETURNING, fetchone might be needed if we want the ID
                    if "RETURNING" in query.upper() and (fetch_one or fetch_all):
                        if fetch_one:
                            return cur.fetchone()
                        else:
                            return cur.fetchall()
                    return cur.rowcount # For simple INSERT/UPDATE/DELETE, return affected rows
                if fetch_one:
                    return cur.fetchone()
                if fetch_all:
                    return cur.fetchall()
        except Exception as e:
            if conn and not commit:
                conn.rollback()
            print(f"SalesService Database query error: {e}")
            raise
        finally:
            if conn:
                self._put_connection(conn)

    def _get_or_create_customer(self, customer_name, email=None, phone=None, address_details=None):
        # Try to find existing customer by name or email (simplified)
        sql_find_customer = "SELECT customer_id FROM customers WHERE customer_name = %s OR email = %s LIMIT 1"
        customer_row = self._execute_query(sql_find_customer, (customer_name, email), fetch_one=True)
        if customer_row:
            return customer_row[0]
        else:
            # Create new customer
            sql_create_customer = """
                INSERT INTO customers (customer_name, email, phone, address_line1, city, country)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING customer_id;
            """
            # Simplified address details for now
            addr = address_details or {}
            new_customer_id_row = self._execute_query(sql_create_customer, (
                customer_name, email, phone, 
                addr.get("address_line1"), addr.get("city"), addr.get("country")
            ), commit=True, fetch_one=True)
            if new_customer_id_row:
                return new_customer_id_row[0]
            else:
                raise Exception("Failed to create or retrieve customer")

    def record_sale(self, customer_name, items, order_date_str, status="Pending", customer_email=None, customer_phone=None, shipping_address=None):
        if not customer_name or not items or not order_date_str:
            return {"error": "Missing customer name, items, or order date"}

        customer_id = self._get_or_create_customer(customer_name, customer_email, customer_phone, shipping_address)
        
        try:
            order_date = datetime.fromisoformat(order_date_str.replace("Z", "+00:00")) if isinstance(order_date_str, str) else order_date_str
        except ValueError:
             return {"error": "Invalid order_date format. Use ISO format."}

        total_amount = 0
        for item in items:
            # Fetch product price from DB to ensure accuracy, or use price provided if that's the business rule
            # For now, assume item contains 'sku', 'quantity', 'price'
            product_info = self._execute_query("SELECT product_id, unit_price FROM products WHERE sku = %s", (item["sku"],), fetch_one=True)
            if not product_info:
                return {"error": f"Product with SKU {item['sku']} not found."}
            item_price = item.get("price", float(product_info[1])) # Use provided price or DB price
            total_amount += item["quantity"] * item_price
            item["product_id"] = product_info[0]
            item["unit_price_at_sale"] = item_price # Store price at time of sale

        # Generate a unique order_number (can be more sophisticated)
        # For now, using a timestamp-based approach for uniqueness, or a sequence
        order_number_prefix = datetime.now().strftime("%Y%m%d%H%M%S")
        last_id_row = self._execute_query("SELECT MAX(order_id) FROM sales_orders", fetch_one=True)
        next_id = (last_id_row[0] or 0) + 1
        order_number = f"SO-{order_number_prefix}-{next_id}"

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
            raise Exception("Failed to create sales order.")
        order_id = order_id_row[0]

        # Insert order items and update inventory
        for item in items:
            sql_insert_item = """
                INSERT INTO sales_order_items (order_id, product_id, sku, quantity, unit_price, line_total)
                VALUES (%s, %s, %s, %s, %s, %s);
            """
            line_total = item["quantity"] * item["unit_price_at_sale"]
            self._execute_query(sql_insert_item, (
                order_id, item["product_id"], item["sku"], item["quantity"], item["unit_price_at_sale"], line_total
            ), commit=True)

            # Update inventory
            sql_update_inventory = """
                UPDATE inventory_levels 
                SET available_quantity = available_quantity - %s 
                WHERE product_id = %s;
            """
            # Add logic to check inventory_level_status based on new quantity if needed
            self._execute_query(sql_update_inventory, (item["quantity"], item["product_id"]), commit=True)

        return self.get_sale_by_id(order_id) # Return the full order details

    def get_all_sales(self):
        sql = """
            SELECT 
                so.order_id, so.order_number, c.customer_name, so.order_date, 
                so.total_amount, so.status,
                so.shipping_address_line1, so.shipping_city, so.shipping_country
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.customer_id
            ORDER BY so.order_date DESC;
        """
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
                    # Add items later if needed for summary, or fetch in get_sale_by_id
                })
        return orders

    def get_sale_by_id(self, order_id):
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
        order_row = self._execute_query(sql_order, (order_id,), fetch_one=True)
        if not order_row:
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
        return order_details

    def update_sale_status(self, order_id, new_status):
        sql = "UPDATE sales_orders SET status = %s WHERE order_id = %s RETURNING order_id;"
        updated_row = self._execute_query(sql, (new_status, order_id), commit=True, fetch_one=True)
        if updated_row:
            return self.get_sale_by_id(order_id)
        return None

    def delete_sale(self, order_id):
        # This is complex: should it revert inventory? Mark as cancelled instead of delete?
        # For now, let's implement a hard delete for sales_order_items and sales_orders.
        # Consider implications for reporting and auditing.
        # Reverting inventory is crucial if a sale is truly deleted/cancelled.
        
        # Get items to revert inventory
        sale_info = self.get_sale_by_id(order_id)
        if not sale_info:
            return False # Order not found

        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                # Revert inventory for each item
                for item in sale_info.get("items", []):
                    sql_revert_inventory = """
                        UPDATE inventory_levels 
                        SET available_quantity = available_quantity + %s 
                        WHERE product_id = %s;
                    """
                    cur.execute(sql_revert_inventory, (item["quantity"], item["product_id"]))

                # Delete order items
                cur.execute("DELETE FROM sales_order_items WHERE order_id = %s", (order_id,))
                # Delete order
                cur.execute("DELETE FROM sales_orders WHERE order_id = %s", (order_id,))
                conn.commit()
                return True
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error deleting sale {order_id}: {e}")
            raise
        finally:
            if conn:
                self._put_connection(conn)
        return False

# print("Sales Management Module - DB Integrated Service Loaded")

