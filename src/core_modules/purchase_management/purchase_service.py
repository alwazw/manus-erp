# Purchase Management Module - Integrated with PostgreSQL

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
    logger.error("DATABASE_URL environment variable is not set for PurchaseService.")
    raise RuntimeError("DATABASE_URL environment variable is not set.")

try:
    db_pool = psycopg2.pool.SimpleConnectionPool(1, 10, dsn=DATABASE_URL)
    logger.info("Database connection pool initialized successfully for PurchaseService.")
except Exception as e:
    logger.critical(f"Error initializing database connection pool in PurchaseService: {e}", exc_info=True)
    db_pool = None

class PurchaseService:
    def __init__(self):
        if db_pool is None:
            logger.error("PurchaseService initialized but database connection pool is not available.")
            raise ConnectionError("Database connection pool is not available for PurchaseService.")
        logger.info("PurchaseService Initialized - Database connection pool ready.")

    def _get_connection(self):
        if db_pool is None:
            logger.error("Attempted to get DB connection for PurchaseService, but pool is not available.")
            raise ConnectionError("Database connection pool is not available.")
        return db_pool.getconn()

    def _put_connection(self, conn):
        if db_pool is not None:
            db_pool.putconn(conn)

    def _execute_query(self, query, params=None, fetch_one=False, fetch_all=False, commit=False):
        conn = None
        logger.debug(f"PurchaseService executing query: {query} with params: {params}")
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute(query, params)
                if commit:
                    conn.commit()
                    logger.info(f"PurchaseService query committed. {cur.rowcount} rows affected.")
                    if "RETURNING" in query.upper() and (fetch_one or fetch_all):
                        if fetch_one:
                            result = cur.fetchone()
                            logger.debug(f"PurchaseService query (commit with returning) fetch_one result: {result}")
                            return result
                        else:
                            results = cur.fetchall()
                            logger.debug(f"PurchaseService query (commit with returning) fetch_all results count: {len(results) if results else 0}")
                            return results
                    return cur.rowcount
                if fetch_one:
                    result = cur.fetchone()
                    logger.debug(f"PurchaseService query fetch_one result: {result}")
                    return result
                if fetch_all:
                    results = cur.fetchall()
                    logger.debug(f"PurchaseService query fetch_all results count: {len(results) if results else 0}")
                    return results
        except Exception as e:
            logger.error(f"PurchaseService Database query error: {e} for query: {query} with params: {params}", exc_info=True)
            if conn and not commit:
                try:
                    conn.rollback()
                    logger.info("PurchaseService transaction rolled back due to error.")
                except Exception as rb_e:
                    logger.error(f"PurchaseService error during rollback: {rb_e}", exc_info=True)
            raise
        finally:
            if conn:
                self._put_connection(conn)

    def _get_or_create_supplier(self, supplier_name, contact_name=None, email=None, phone=None, address_details=None):
        logger.info(f"Getting or creating supplier: {supplier_name}, email: {email}")
        sql_find_supplier = "SELECT supplier_id FROM suppliers WHERE supplier_name = %s OR (email IS NOT NULL AND email = %s) LIMIT 1"
        supplier_row = self._execute_query(sql_find_supplier, (supplier_name, email), fetch_one=True)
        if supplier_row:
            logger.info(f"Found existing supplier_id: {supplier_row[0]} for name: {supplier_name}")
            return supplier_row[0]
        else:
            logger.info(f"Creating new supplier: {supplier_name}")
            sql_create_supplier = """
                INSERT INTO suppliers (supplier_name, contact_name, email, phone, address_line1, city, country)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING supplier_id;
            """
            addr = address_details or {}
            new_supplier_id_row = self._execute_query(sql_create_supplier, (
                supplier_name, contact_name, email, phone,
                addr.get("address_line1"), addr.get("city"), addr.get("country")
            ), commit=True, fetch_one=True)
            if new_supplier_id_row:
                logger.info(f"Created new supplier_id: {new_supplier_id_row[0]} for name: {supplier_name}")
                return new_supplier_id_row[0]
            else:
                logger.error(f"Failed to create or retrieve supplier: {supplier_name}")
                raise Exception("Failed to create or retrieve supplier")

    def record_purchase(self, supplier_name, items, order_date_str, status="Ordered", supplier_contact=None, supplier_email=None, supplier_phone=None, expected_delivery_date_str=None, notes=None):
        logger.info(f"Attempting to record purchase for supplier: {supplier_name}, items_count: {len(items) if items else 0}, order_date: {order_date_str}")
        if not supplier_name or not items or not order_date_str:
            logger.warning("Record purchase attempt with missing supplier_name, items, or order_date.")
            return {"error": "Missing supplier name, items, or order date"}

        try:
            supplier_id = self._get_or_create_supplier(supplier_name, supplier_contact, supplier_email, supplier_phone)
            
            try:
                order_date = datetime.fromisoformat(order_date_str.replace("Z", "+00:00")) if isinstance(order_date_str, str) else order_date_str
                expected_delivery_date = None
                if expected_delivery_date_str:
                    expected_delivery_date = datetime.fromisoformat(expected_delivery_date_str.replace("Z", "+00:00")) if isinstance(expected_delivery_date_str, str) else expected_delivery_date_str
            except ValueError as ve:
                logger.warning(f"Invalid date format. Order Date: {order_date_str}, Expected Delivery: {expected_delivery_date_str}. Error: {ve}")
                return {"error": "Invalid date format. Use ISO format for order_date and expected_delivery_date."}

            total_amount = 0
            processed_items = []
            for item_idx, item_data in enumerate(items):
                logger.debug(f"Processing purchase item {item_idx + 1}: SKU {item_data.get("sku")}")
                product_info = self._execute_query("SELECT product_id FROM products WHERE sku = %s", (item_data["sku"],), fetch_one=True)
                if not product_info:
                    logger.error(f"Product with SKU {item_data["sku"]} not found during purchase recording.")
                    return {"error": f"Product with SKU {item_data["sku"]} not found."}
                
                item_cost = item_data.get("cost_price") # Assuming cost_price is provided
                if item_cost is None:
                    logger.error(f"Missing cost_price for SKU {item_data["sku"]} in purchase item.")
                    return {"error": f"Missing cost_price for SKU {item_data["sku"]}."}
                item_cost = float(item_cost)
                total_amount += item_data["quantity"] * item_cost
                processed_items.append({
                    "product_id": product_info[0],
                    "sku": item_data["sku"],
                    "quantity": item_data["quantity"],
                    "unit_cost_at_purchase": item_cost
                })
            logger.debug(f"Calculated total_amount: {total_amount} for the purchase.")

            po_number_prefix = datetime.now().strftime("%Y%m%d%H%M%S")
            last_id_row = self._execute_query("SELECT MAX(po_id) FROM purchase_orders", fetch_one=True)
            next_id = (last_id_row[0] if last_id_row and last_id_row[0] is not None else 0) + 1
            po_number = f"PO-{po_number_prefix}-{next_id}"
            logger.info(f"Generated po_number: {po_number}")

            sql_insert_po = """
                INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_delivery_date, total_amount, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING po_id;
            """
            po_id_row = self._execute_query(sql_insert_po, (
                po_number, supplier_id, order_date, expected_delivery_date, total_amount, status, notes
            ), commit=True, fetch_one=True)

            if not po_id_row:
                logger.error("Failed to create purchase order after generating po_number.")
                raise Exception("Failed to create purchase order.")
            po_id = po_id_row[0]
            logger.info(f"Purchase order created with po_id: {po_id}")

            for item in processed_items:
                sql_insert_item = """
                    INSERT INTO purchase_order_items (po_id, product_id, sku, quantity, unit_cost, line_total)
                    VALUES (%s, %s, %s, %s, %s, %s);
                """
                line_total = item["quantity"] * item["unit_cost_at_purchase"]
                self._execute_query(sql_insert_item, (
                    po_id, item["product_id"], item["sku"], item["quantity"], item["unit_cost_at_purchase"], line_total
                ), commit=True)
                logger.debug(f"Inserted purchase_order_item for po_id {po_id}, product_id {item["product_id"]}")
                
                if status == "Received":
                    logger.info(f"PO {po_id} is 'Received'. Updating inventory for product_id {item["product_id"]}")
                    self._update_inventory_and_costs_on_receive(item["product_id"], item["quantity"], item["unit_cost_at_purchase"])

            return self.get_purchase_by_id(po_id)
        except Exception as e:
            logger.error(f"Error in record_purchase for supplier {supplier_name}: {str(e)}", exc_info=True)
            return {"error": f"An unexpected error occurred: {str(e)}"}

    def _update_inventory_and_costs_on_receive(self, product_id, quantity_received, unit_cost):
        logger.info(f"Updating inventory and costs for product_id: {product_id} upon receiving {quantity_received} units at cost {unit_cost}")
        sql_update_inventory = """
            UPDATE inventory_levels 
            SET available_quantity = available_quantity + %s,
                last_updated = CURRENT_TIMESTAMP
            WHERE product_id = %s;
        """
        self._execute_query(sql_update_inventory, (quantity_received, product_id), commit=True)
        logger.info(f"Inventory quantity updated for product_id: {product_id} by +{quantity_received}")

        current_product_data = self._execute_query("SELECT p.average_cost, il.available_quantity FROM products p JOIN inventory_levels il ON p.product_id = il.product_id WHERE p.product_id = %s", (product_id,), fetch_one=True)
        if current_product_data:
            old_avg_cost = float(current_product_data[0] or 0)
            current_total_quantity = int(current_product_data[1] or 0) 
            old_total_quantity = current_total_quantity - quantity_received
            if old_total_quantity < 0: old_total_quantity = 0

            new_avg_cost = ((old_avg_cost * old_total_quantity) + (unit_cost * quantity_received)) / current_total_quantity if current_total_quantity > 0 else unit_cost
            logger.debug(f"Calculated new average_cost: {new_avg_cost} for product_id: {product_id}")
            
            sql_update_product_costs = """
                UPDATE products
                SET last_purchase_price = %s, average_cost = %s, updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s;
            """
            self._execute_query(sql_update_product_costs, (unit_cost, new_avg_cost, product_id), commit=True)
            logger.info(f"Product costs (last_purchase_price, average_cost) updated for product_id: {product_id}")
        else:
            logger.warning(f"Could not retrieve current product data to update average_cost for product_id: {product_id}")

    def get_all_purchases(self):
        logger.info("Fetching all purchase orders.")
        sql = """
            SELECT 
                po.po_id, po.po_number, s.supplier_name, po.order_date, 
                po.expected_delivery_date, po.total_amount, po.status
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.supplier_id
            ORDER BY po.order_date DESC;
        """
        try:
            rows = self._execute_query(sql, fetch_all=True)
            orders = []
            if rows:
                for row in rows:
                    orders.append({
                        "po_id": row[0],
                        "po_number": row[1],
                        "supplier_name": row[2],
                        "order_date": row[3].isoformat() if row[3] else None,
                        "expected_delivery_date": row[4].isoformat() if row[4] else None,
                        "total_amount": float(row[5]) if row[5] is not None else None,
                        "status": row[6]
                    })
            logger.info(f"Retrieved {len(orders)} purchase orders.")
            return orders
        except Exception as e:
            logger.error(f"Error in get_all_purchases: {str(e)}", exc_info=True)
            raise

    def get_purchase_by_id(self, po_id):
        logger.info(f"Fetching purchase order by po_id: {po_id}")
        sql_po = """
            SELECT 
                po.po_id, po.po_number, s.supplier_name, s.email as supplier_email, po.order_date, 
                po.expected_delivery_date, po.total_amount, po.status, po.notes
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.supplier_id
            WHERE po.po_id = %s;
        """
        try:
            po_row = self._execute_query(sql_po, (po_id,), fetch_one=True)
            if not po_row:
                logger.warning(f"Purchase order not found for po_id: {po_id}")
                return None

            po_details = {
                "po_id": po_row[0],
                "po_number": po_row[1],
                "supplier_name": po_row[2],
                "supplier_email": po_row[3],
                "order_date": po_row[4].isoformat() if po_row[4] else None,
                "expected_delivery_date": po_row[5].isoformat() if po_row[5] else None,
                "total_amount": float(po_row[6]) if po_row[6] is not None else None,
                "status": po_row[7],
                "notes": po_row[8],
                "items": []
            }

            sql_items = """
                SELECT poi.po_item_id, poi.product_id, p.product_name, poi.sku, 
                       poi.quantity, poi.unit_cost, poi.line_total
                FROM purchase_order_items poi
                JOIN products p ON poi.product_id = p.product_id
                WHERE poi.po_id = %s;
            """
            item_rows = self._execute_query(sql_items, (po_id,), fetch_all=True)
            if item_rows:
                for item_row in item_rows:
                    po_details["items"].append({
                        "po_item_id": item_row[0],
                        "product_id": item_row[1],
                        "product_name": item_row[2],
                        "sku": item_row[3],
                        "quantity": item_row[4],
                        "unit_cost": float(item_row[5]) if item_row[5] is not None else None,
                        "line_total": float(item_row[6]) if item_row[6] is not None else None
                    })
            logger.info(f"Successfully retrieved purchase order details for po_id: {po_id}")
            return po_details
        except Exception as e:
            logger.error(f"Error in get_purchase_by_id for po_id {po_id}: {str(e)}", exc_info=True)
            raise

    def update_purchase_status(self, po_id, new_status):
        logger.info(f"Attempting to update status for purchase order po_id: {po_id} to {new_status}")
        try:
            current_po = self.get_purchase_by_id(po_id) # Uses its own logging
            if not current_po:
                logger.warning(f"Update status failed: Purchase order not found for po_id: {po_id}")
                return None

            sql = "UPDATE purchase_orders SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE po_id = %s RETURNING po_id;"
            updated_row = self._execute_query(sql, (new_status, po_id), commit=True, fetch_one=True)
            
            if updated_row and new_status == "Received" and current_po["status"] != "Received":
                logger.info(f"Purchase order {po_id} status changed to 'Received'. Updating inventory and costs for its items.")
                for item in current_po.get("items", []):
                    self._update_inventory_and_costs_on_receive(item["product_id"], item["quantity"], item["unit_cost"])
            
            if updated_row:
                logger.info(f"Purchase order po_id: {po_id} status updated to {new_status}")
                return self.get_purchase_by_id(po_id)
            logger.warning(f"Failed to update status for purchase order po_id: {po_id} (not found or no change)")
            return None
        except Exception as e:
            logger.error(f"Error in update_purchase_status for po_id {po_id}: {str(e)}", exc_info=True)
            raise

    def delete_purchase(self, po_id):
        logger.info(f"Attempting to delete purchase order po_id: {po_id}")
        try:
            current_po = self.get_purchase_by_id(po_id)
            if not current_po:
                logger.warning(f"Delete failed: Purchase order not found for po_id: {po_id}")
                return False
            
            if current_po["status"] == "Received":
                logger.warning(f"Attempted to delete Purchase Order {po_id} which is already 'Received'. Deletion without inventory reversal can cause discrepancies. Proceeding with deletion of PO records only.")
                # Consider if inventory should be reverted here or if deletion of received POs should be disallowed.

            self._execute_query("DELETE FROM purchase_order_items WHERE po_id = %s", (po_id,), commit=True)
            logger.info(f"Deleted purchase_order_items for po_id: {po_id}")
            deleted_rows = self._execute_query("DELETE FROM purchase_orders WHERE po_id = %s", (po_id,), commit=True)
            if deleted_rows > 0:
                logger.info(f"Purchase order po_id: {po_id} deleted successfully.")
                return True
            else:
                # This case should ideally not be reached if get_purchase_by_id found it.
                logger.warning(f"Purchase order po_id: {po_id} was not found in purchase_orders table for deletion, though items might have been deleted.")
                return False
        except Exception as e:
            logger.error(f"Error deleting purchase order {po_id}: {str(e)}", exc_info=True)
            raise

logger.info("Purchase Management Module (purchase_service.py) Loaded with DB integration and logging.")

