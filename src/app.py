# Main Flask application for ERP Backend APIs

from flask import Flask, jsonify, request
from flask_cors import CORS # Import CORS
import os
import sys

# Add the project root to the Python path to allow importing modules from src
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
sys.path.insert(0, project_root)

from src.core_modules.product_management.product_service import ProductService
from src.core_modules.sales_management.sales_service import SalesService
from src.core_modules.purchase_management.purchase_service import PurchaseService
from src.core_modules.reporting_module.reporting_service import generate_sales_report, generate_inventory_report, generate_purchase_report
from src.core_modules.accounting_module.accounting_service import AccountingService # New import

app = Flask(__name__)
CORS(app) # Enable CORS for all routes and origins by default

# Initialize services
product_service = ProductService()
sales_service = SalesService()
purchase_service = PurchaseService()
accounting_service = AccountingService() # New service initialized

@app.route("/")
def hello():
    db_url = os.getenv("DATABASE_URL", "Not Set")
    redis_host = os.getenv("REDIS_HOST", "Not Set")
    return f"""<h1>ERP Backend API Server</h1>
               <p>This server provides APIs for the ERP system.</p>
               <p><strong>Database URL (from .env):</strong> {db_url}</p>
               <p><strong>Redis Host (from .env):</strong> {redis_host}</p>
               <p>Access API endpoints under /api/...</p>"""

# --- Product Management APIs ---
@app.route("/api/products", methods=["GET"])
def get_products():
    products = product_service.get_all_products()
    return jsonify(products)

@app.route("/api/products", methods=["POST"])
def add_product_api():
    data = request.get_json()
    if not data or not all(k in data for k in ("sku", "name", "category")):
        return jsonify({"error": "Missing data for SKU, name, or category"}), 400
    inventory_status = data.get("inventory_level_status", "In Stock")
    quantity = data.get("quantity", 0)
    try:
        result = product_service.add_product(data["sku"], data["name"], data["category"], inventory_status, quantity)
        return jsonify(result), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<string:sku>", methods=["GET"])
def get_product_by_sku_api(sku):
    product = product_service.get_product_by_sku(sku)
    if product:
        return jsonify(product)
    return jsonify({"error": "Product not found"}), 404

@app.route("/api/products/<string:sku>", methods=["PUT"])
def update_product_api(sku):
    data = request.get_json()
    updated_product = product_service.update_product(sku, data)
    if updated_product:
        return jsonify(updated_product)
    return jsonify({"error": "Product not found or update failed"}), 404

@app.route("/api/products/<string:sku>", methods=["DELETE"])
def delete_product_api(sku):
    if product_service.delete_product(sku):
        return jsonify({"message": "Product deleted successfully"}), 200
    return jsonify({"error": "Product not found or delete failed"}), 404

# --- Sales Management APIs ---
@app.route("/api/sales", methods=["GET"])
def get_all_sales_api():
    sales = sales_service.get_all_sales()
    return jsonify(sales)

@app.route("/api/sales", methods=["POST"])
def record_sale_api():
    data = request.get_json()
    if not data or not all(k in data for k in ("customer_name", "items", "order_date")):
        return jsonify({"error": "Missing required sales data"}), 400
    sale = sales_service.record_sale(data["customer_name"], data["items"], data["order_date"], data.get("status", "Pending"))
    if "error" in sale:
        return jsonify(sale), 400
    return jsonify(sale), 201

@app.route("/api/sales/<string:order_id>", methods=["GET"])
def get_sale_by_id_api(order_id):
    sale = sales_service.get_sale_by_id(order_id)
    if sale:
        return jsonify(sale)
    return jsonify({"error": "Sale not found"}), 404

@app.route("/api/sales/<string:order_id>/status", methods=["PUT"])
def update_sale_status_api(order_id):
    data = request.get_json()
    if not data or "new_status" not in data:
        return jsonify({"error": "Missing new_status"}), 400
    updated_sale = sales_service.update_sale_status(order_id, data["new_status"])
    if updated_sale:
        return jsonify(updated_sale)
    return jsonify({"error": "Sale not found or update failed"}), 404

# --- Purchase Management APIs ---
@app.route("/api/purchases", methods=["GET"])
def get_all_purchases_api():
    purchases = purchase_service.get_all_purchases()
    return jsonify(purchases)

@app.route("/api/purchases", methods=["POST"])
def record_purchase_api():
    data = request.get_json()
    if not data or not all(k in data for k in ("supplier_name", "items", "order_date")):
        return jsonify({"error": "Missing required purchase data"}), 400
    purchase = purchase_service.record_purchase(data["supplier_name"], data["items"], data["order_date"], data.get("status", "Ordered"))
    if "error" in purchase:
        return jsonify(purchase), 400
    return jsonify(purchase), 201

@app.route("/api/purchases/<string:purchase_id>", methods=["GET"])
def get_purchase_by_id_api(purchase_id):
    purchase = purchase_service.get_purchase_by_id(purchase_id)
    if purchase:
        return jsonify(purchase)
    return jsonify({"error": "Purchase order not found"}), 404

@app.route("/api/purchases/<string:purchase_id>/status", methods=["PUT"])
def update_purchase_status_api(purchase_id):
    data = request.get_json()
    if not data or "new_status" not in data:
        return jsonify({"error": "Missing new_status"}), 400
    updated_purchase = purchase_service.update_purchase_status(purchase_id, data["new_status"])
    if updated_purchase:
        return jsonify(updated_purchase)
    return jsonify({"error": "Purchase order not found or update failed"}), 404

# --- Reporting/Analytics APIs ---
@app.route("/api/reports/sales", methods=["GET"])
def get_sales_report_api():
    start_date = request.args.get("start_date", "2024-01-01")
    end_date = request.args.get("end_date", "2024-12-31")
    group_by = request.args.get("group_by")
    report = generate_sales_report(start_date, end_date, group_by)
    return jsonify(report)

@app.route("/api/reports/inventory", methods=["GET"])
def get_inventory_report_api():
    as_of_date = request.args.get("as_of_date", "2024-12-31")
    low_stock_threshold_str = request.args.get("low_stock_threshold")
    low_stock_threshold = int(low_stock_threshold_str) if low_stock_threshold_str else None
    report = generate_inventory_report(as_of_date, low_stock_threshold)
    return jsonify(report)

@app.route("/api/reports/purchases", methods=["GET"])
def get_purchase_report_api():
    start_date = request.args.get("start_date", "2024-01-01")
    end_date = request.args.get("end_date", "2024-12-31")
    group_by_supplier_str = request.args.get("group_by_supplier", "false")
    group_by_supplier = group_by_supplier_str.lower() == "true"
    report = generate_purchase_report(start_date, end_date, group_by_supplier)
    return jsonify(report)

# --- Accounting APIs ---
@app.route("/api/accounting/chart-of-accounts", methods=["GET"])
def get_chart_of_accounts_api():
    accounts = accounting_service.get_chart_of_accounts()
    return jsonify(accounts)

@app.route("/api/accounting/chart-of-accounts", methods=["POST"])
def add_account_api():
    data = request.get_json()
    if not data or not all(k in data for k in ("account_id", "account_name", "account_type")):
        return jsonify({"error": "Missing account_id, account_name, or account_type"}), 400
    result = accounting_service.add_account(data["account_id"], data["account_name"], data["account_type"])
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 201

@app.route("/api/accounting/journal-entries", methods=["GET"])
def get_journal_entries_api():
    entries = accounting_service.get_all_journal_entries()
    return jsonify(entries)

@app.route("/api/accounting/journal-entries", methods=["POST"])
def create_journal_entry_api():
    data = request.get_json()
    if not data or not all(k in data for k in ("date", "description", "lines")):
        return jsonify({"error": "Missing date, description, or lines for journal entry"}), 400
    result = accounting_service.create_journal_entry(data["date"], data["description"], data["lines"])
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 201

@app.route("/api/accounting/journal-entries/<string:entry_id>", methods=["GET"])
def get_journal_entry_by_id_api(entry_id):
    entry = accounting_service.get_journal_entry_by_id(entry_id)
    if entry:
        return jsonify(entry)
    return jsonify({"error": "Journal entry not found"}), 404

@app.route("/api/accounting/reports/trial-balance", methods=["GET"])
def get_trial_balance_api():
    as_of_date = request.args.get("as_of_date", "2024-12-31") # Example default
    report = accounting_service.generate_trial_balance(as_of_date)
    return jsonify(report)

@app.route("/api/accounting/reports/income-statement", methods=["GET"])
def get_income_statement_api():
    start_date = request.args.get("start_date", "2024-01-01")
    end_date = request.args.get("end_date", "2024-12-31")
    report = accounting_service.generate_income_statement(start_date, end_date)
    return jsonify(report)

@app.route("/api/accounting/reports/balance-sheet", methods=["GET"])
def get_balance_sheet_api():
    as_of_date = request.args.get("as_of_date", "2024-12-31")
    report = accounting_service.generate_balance_sheet(as_of_date)
    return jsonify(report)

if __name__ == "__main__":
    port = int(os.getenv("APP_PORT", 8000))
    debug_mode = os.getenv("DEBUG", "False").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)

