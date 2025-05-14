# Purchase Management Module - Integrated with PostgreSQL

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
    print(f"Error initializing database connection pool in PurchaseService: {e}")
    db_pool = None

class PurchaseService:
    def __init__(self):
        if db_pool is None:
            raise ConnectionError("Database connection pool is not available for PurchaseService.")
        print("PurchaseService Initialized - Database connection pool ready.")

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
                    if "RETURNING" in query.upper() and (fetch_one or fetch_all):
                        if fetch_one:
                            return cur.fetchone()
                        else:
                            return cur.fetchall()
                    return cur.rowcount
                if fetch_one:
                    return cur.fetchone()
                if fetch_all:
                    return cur.fetchall()
        except Exception as e:
            if conn and not commit:
                conn.rollback()
            print(f"PurchaseService Database query error: {e}")
            raise
        finally:
            if conn:
                self._put_connection(conn)

    def _get_or_create_supplier(self, supplier_name, contact_name=None, email=None, phone=None, address_details=None):
        sql_find_supplier = "SELECT supplier_id FROM suppliers WHERE supplier_name = %s OR email = %s LIMIT 1"
        supplier_row = self._execute_query(sql_find_supplier, (supplier_name, email), fetch_one=True)
        if supplier_row:
            return supplier_row[0]
        else:
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
                return new_supplier_id_row[0]
            else:
                raise Exception("Failed to create or retrieve supplier")

    def record_purchase(self, supplier_name, items, order_date_str, status="Ordered", supplier_contact=None, supplier_email=None, supplier_phone=None, expected_delivery_date_str=None, notes=None):
        if not supplier_name or not items or not order_date_str:
            return {"error": "Missing supplier name, items, or order date"}

        supplier_id = self._get_or_create_supplier(supplier_name, supplier_contact, supplier_email, supplier_phone)
        
        try:
            order_date = datetime.fromisoformat(order_date_str.replace("Z", "+00:00")) if isinstance(order_date_str, str) else order_date_str
            expected_delivery_date = None
            if expected_delivery_date_str:
                expected_delivery_date = datetime.fromisoformat(expected_delivery_date_str.replace("Z", "+00:00")) if isinstance(expected_delivery_date_str, str) else expected_delivery_date_str
        except ValueError:
             return {"error": "Invalid date format. Use ISO format for order_date and expected_delivery_date."}

        total_amount = 0
        for item in items:
            product_info = self._execute_query("SELECT product_id, unit_price, average_cost FROM products WHERE sku = %s", (item["sku"],), fetch_one=True)
            if not product_info:
                return {"error": f"Product with SKU {item["sku"]} not found."}
            item_cost = item.get("cost_price", float(product_info[1])) # Default to unit_price if cost_price not given, or define specific logic
            total_amount += item["quantity"] * item_cost
            item["product_id"] = product_info[0]
            item["unit_cost_at_purchase"] = item_cost

        po_number_prefix = datetime.now().strftime("%Y%m%d%H%M%S")
        last_id_row = self._execute_query("SELECT MAX(po_id) FROM purchase_orders", fetch_one=True)
        next_id = (last_id_row[0] or 0) + 1
        po_number = f"PO-{po_number_prefix}-{next_id}"

        sql_insert_po = """
            INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_delivery_date, total_amount, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING po_id;
        """
        po_id_row = self._execute_query(sql_insert_po, (
            po_number, supplier_id, order_date, expected_delivery_date, total_amount, status, notes
        ), commit=True, fetch_one=True)

        if not po_id_row:
            raise Exception("Failed to create purchase order.")
        po_id = po_id_row[0]

        for item in items:
            sql_insert_item = """
                INSERT INTO purchase_order_items (po_id, product_id, sku, quantity, unit_cost, line_total)
                VALUES (%s, %s, %s, %s, %s, %s);
            """
            line_total = item["quantity"] * item["unit_cost_at_purchase"]
            self._execute_query(sql_insert_item, (
                po_id, item["product_id"], item["sku"], item["quantity"], item["unit_cost_at_purchase"], line_total
            ), commit=True)
            
            # If status is 'Received', update inventory and product costs
            if status == "Received":
                self._update_inventory_and_costs_on_receive(item["product_id"], item["quantity"], item["unit_cost_at_purchase"])

        return self.get_purchase_by_id(po_id)

    def _update_inventory_and_costs_on_receive(self, product_id, quantity_received, unit_cost):
        # Update inventory quantity
        sql_update_inventory = """
            UPDATE inventory_levels 
            SET available_quantity = available_quantity + %s,
                last_updated = CURRENT_TIMESTAMP
            WHERE product_id = %s;
        """
        self._execute_query(sql_update_inventory, (quantity_received, product_id), commit=True)

        # Update product's last_purchase_price and potentially average_cost
        # Average cost calculation can be complex (e.g., weighted average). Simplified here.
        # Fetch current average_cost and quantity
        current_product_data = self._execute_query("SELECT p.average_cost, il.available_quantity FROM products p JOIN inventory_levels il ON p.product_id = il.product_id WHERE p.product_id = %s", (product_id,), fetch_one=True)
        if current_product_data:
            old_avg_cost = float(current_product_data[0] or 0)
            # available_quantity here is *after* receiving current PO items
            current_total_quantity = int(current_product_data[1] or 0) 
            
            # Calculate new average cost (simplified: (old_total_value + new_purchase_value) / new_total_quantity)
            # old_total_quantity would be current_total_quantity - quantity_received
            old_total_quantity = current_total_quantity - quantity_received
            if old_total_quantity < 0: old_total_quantity = 0 # Safety for first purchase

            new_avg_cost = ((old_avg_cost * old_total_quantity) + (unit_cost * quantity_received)) / current_total_quantity if current_total_quantity > 0 else unit_cost
            
            sql_update_product_costs = """
                UPDATE products
                SET last_purchase_price = %s, average_cost = %s, updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s;
            """
            self._execute_query(sql_update_product_costs, (unit_cost, new_avg_cost, product_id), commit=True)

    def get_all_purchases(self):
        sql = """
            SELECT 
                po.po_id, po.po_number, s.supplier_name, po.order_date, 
                po.expected_delivery_date, po.total_amount, po.status
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.supplier_id
            ORDER BY po.order_date DESC;
        """
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
        return orders

    def get_purchase_by_id(self, po_id):
        sql_po = """
            SELECT 
                po.po_id, po.po_number, s.supplier_name, s.email as supplier_email, po.order_date, 
                po.expected_delivery_date, po.total_amount, po.status, po.notes
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.supplier_id
            WHERE po.po_id = %s;
        """
        po_row = self._execute_query(sql_po, (po_id,), fetch_one=True)
        if not po_row:
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
        return po_details

    def update_purchase_status(self, po_id, new_status):
        # If status changes to "Received", we need to update inventory and product costs.
        current_po = self.get_purchase_by_id(po_id)
        if not current_po:
            return None

        sql = "UPDATE purchase_orders SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE po_id = %s RETURNING po_id;"
        updated_row = self._execute_query(sql, (new_status, po_id), commit=True, fetch_one=True)
        
        if updated_row and new_status == "Received" and current_po["status"] != "Received":
            for item in current_po.get("items", []):
                self._update_inventory_and_costs_on_receive(item["product_id"], item["quantity"], item["unit_cost"])
        
        if updated_row:
            return self.get_purchase_by_id(po_id)
        return None

    def delete_purchase(self, po_id):
        # Similar to sales, consider implications. If PO was received, should inventory be reverted?
        # For now, a hard delete. If it was received, this logic doesn't revert inventory.
        # A more robust system would prevent deletion of received POs or handle inventory adjustments.
        current_po = self.get_purchase_by_id(po_id)
        if not current_po:
            return False
        
        # If PO was received, deleting it without reverting inventory would cause discrepancies.
        # This simplified version does not revert inventory upon PO deletion.
        # A better approach might be to mark as "Cancelled" and handle adjustments if needed.

        self._execute_query("DELETE FROM purchase_order_items WHERE po_id = %s", (po_id,), commit=True)
        deleted_rows = self._execute_query("DELETE FROM purchase_orders WHERE po_id = %s", (po_id,), commit=True)
        return deleted_rows > 0

# print("Purchase Management Module - DB Integrated Service Loaded")

