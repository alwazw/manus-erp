# Main Flask application for ERP Backend APIs

from flask import Flask, jsonify, request
from flask_cors import CORS # Import CORS
import os
import sys
import logging # Import the logging module

# Add the project root to the Python path to allow importing modules from src
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
sys.path.insert(0, project_root)

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    handlers=[
                        logging.StreamHandler(sys.stdout) # Log to stdout for Docker
                    ])
logger = logging.getLogger(__name__)

from src.core_modules.product_management.product_service import ProductService
from src.core_modules.sales_management.sales_service import SalesService
from src.core_modules.purchase_management.purchase_service import PurchaseService
from src.core_modules.reporting_module.reporting_service import generate_sales_report, generate_inventory_report, generate_purchase_report
from src.core_modules.accounting_module.accounting_service import AccountingService

app = Flask(__name__)
CORS(app) # Enable CORS for all routes and origins by default

# Initialize services
product_service = ProductService()
sales_service = SalesService()
purchase_service = PurchaseService()
accounting_service = AccountingService()

logger.info("ERP Backend Application Initialized")

@app.before_request
def log_request_info():
    logger.info(f"Request: {request.method} {request.url} - Headers: {request.headers} - Body: {request.get_data(as_text=True)}")

@app.after_request
def log_response_info(response):
    logger.info(f"Response: {response.status} - Body: {response.get_data(as_text=True)}")
    return response

@app.route("/")
def hello():
    db_url = os.getenv("DATABASE_URL", "Not Set")
    redis_host = os.getenv("REDIS_HOST", "Not Set")
    logger.info("Root endpoint accessed.")
    return f"""<h1>ERP Backend API Server</h1>
               <p>This server provides APIs for the ERP system.</p>
               <p><strong>Database URL (from .env):</strong> {db_url}</p>
               <p><strong>Redis Host (from .env):</strong> {redis_host}</p>
               <p>Access API endpoints under /api/...</p>"""

# --- Product Management APIs ---
@app.route("/api/products", methods=["GET"])
def get_products():
    logger.info("GET /api/products called")
    try:
        products = product_service.get_all_products()
        return jsonify(products)
    except Exception as e:
        logger.error(f"Error in get_products: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve products"}), 500

@app.route("/api/products", methods=["POST"])
def add_product_api():
    data = request.get_json()
    logger.info(f"POST /api/products called with data: {data}")
    if not data or not all(k in data for k in ("sku", "name", "category")):
        logger.warning("Add product attempt with missing data")
        return jsonify({"error": "Missing data for SKU, name, or category"}), 400
    inventory_status = data.get("inventory_level_status", "In Stock")
    quantity = data.get("quantity", 0)
    try:
        result = product_service.add_product(data["sku"], data["name"], data["category"], inventory_status, quantity)
        logger.info(f"Product added: {result}")
        return jsonify(result), 201
    except Exception as e:
        logger.error(f"Error in add_product_api: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<string:sku>", methods=["GET"])
def get_product_by_sku_api(sku):
    logger.info(f"GET /api/products/{sku} called")
    try:
        product = product_service.get_product_by_sku(sku)
        if product:
            return jsonify(product)
        logger.warning(f"Product with SKU {sku} not found")
        return jsonify({"error": "Product not found"}), 404
    except Exception as e:
        logger.error(f"Error in get_product_by_sku_api for SKU {sku}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve product"}), 500

@app.route("/api/products/<string:sku>", methods=["PUT"])
def update_product_api(sku):
    data = request.get_json()
    logger.info(f"PUT /api/products/{sku} called with data: {data}")
    try:
        updated_product = product_service.update_product(sku, data)
        if updated_product:
            logger.info(f"Product {sku} updated: {updated_product}")
            return jsonify(updated_product)
        logger.warning(f"Product {sku} not found or update failed")
        return jsonify({"error": "Product not found or update failed"}), 404
    except Exception as e:
        logger.error(f"Error in update_product_api for SKU {sku}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update product"}), 500

@app.route("/api/products/<string:sku>", methods=["DELETE"])
def delete_product_api(sku):
    logger.info(f"DELETE /api/products/{sku} called")
    try:
        if product_service.delete_product(sku):
            logger.info(f"Product {sku} deleted successfully")
            return jsonify({"message": "Product deleted successfully"}), 200
        logger.warning(f"Product {sku} not found or delete failed")
        return jsonify({"error": "Product not found or delete failed"}), 404
    except Exception as e:
        logger.error(f"Error in delete_product_api for SKU {sku}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to delete product"}), 500

# --- Sales Management APIs ---
@app.route("/api/sales", methods=["GET"])
def get_all_sales_api():
    logger.info("GET /api/sales called")
    try:
        sales = sales_service.get_all_sales()
        return jsonify(sales)
    except Exception as e:
        logger.error(f"Error in get_all_sales_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve sales orders"}), 500

@app.route("/api/sales", methods=["POST"])
def record_sale_api():
    data = request.get_json()
    logger.info(f"POST /api/sales called with data: {data}")
    if not data or not all(k in data for k in ("customer_name", "items", "order_date")):
        logger.warning("Record sale attempt with missing data")
        return jsonify({"error": "Missing required sales data"}), 400
    try:
        sale = sales_service.record_sale(data["customer_name"], data["items"], data["order_date"], data.get("status", "Pending"))
        if "error" in sale:
            logger.error(f"Error recording sale: {sale["error"]}")
            return jsonify(sale), 400
        logger.info(f"Sale recorded: {sale}")
        return jsonify(sale), 201
    except Exception as e:
        logger.error(f"Error in record_sale_api: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/sales/<string:order_id>", methods=["GET"])
def get_sale_by_id_api(order_id):
    logger.info(f"GET /api/sales/{order_id} called")
    try:
        sale = sales_service.get_sale_by_id(order_id)
        if sale:
            return jsonify(sale)
        logger.warning(f"Sale with ID {order_id} not found")
        return jsonify({"error": "Sale not found"}), 404
    except Exception as e:
        logger.error(f"Error in get_sale_by_id_api for ID {order_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve sale"}), 500

@app.route("/api/sales/<string:order_id>/status", methods=["PUT"])
def update_sale_status_api(order_id):
    data = request.get_json()
    logger.info(f"PUT /api/sales/{order_id}/status called with data: {data}")
    if not data or "new_status" not in data:
        logger.warning(f"Update sale status attempt for {order_id} with missing new_status")
        return jsonify({"error": "Missing new_status"}), 400
    try:
        updated_sale = sales_service.update_sale_status(order_id, data["new_status"])
        if updated_sale:
            logger.info(f"Sale {order_id} status updated: {updated_sale}")
            return jsonify(updated_sale)
        logger.warning(f"Sale {order_id} not found or status update failed")
        return jsonify({"error": "Sale not found or update failed"}), 404
    except Exception as e:
        logger.error(f"Error in update_sale_status_api for ID {order_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update sale status"}), 500

# --- Purchase Management APIs ---
@app.route("/api/purchases", methods=["GET"])
def get_all_purchases_api():
    logger.info("GET /api/purchases called")
    try:
        purchases = purchase_service.get_all_purchases()
        return jsonify(purchases)
    except Exception as e:
        logger.error(f"Error in get_all_purchases_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve purchase orders"}), 500

@app.route("/api/purchases", methods=["POST"])
def record_purchase_api():
    data = request.get_json()
    logger.info(f"POST /api/purchases called with data: {data}")
    if not data or not all(k in data for k in ("supplier_name", "items", "order_date")):
        logger.warning("Record purchase attempt with missing data")
        return jsonify({"error": "Missing required purchase data"}), 400
    try:
        purchase = purchase_service.record_purchase(data["supplier_name"], data["items"], data["order_date"], data.get("status", "Ordered"))
        if "error" in purchase:
            logger.error(f"Error recording purchase: {purchase["error"]}")
            return jsonify(purchase), 400
        logger.info(f"Purchase recorded: {purchase}")
        return jsonify(purchase), 201
    except Exception as e:
        logger.error(f"Error in record_purchase_api: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/purchases/<string:purchase_id>", methods=["GET"])
def get_purchase_by_id_api(purchase_id):
    logger.info(f"GET /api/purchases/{purchase_id} called")
    try:
        purchase = purchase_service.get_purchase_by_id(purchase_id)
        if purchase:
            return jsonify(purchase)
        logger.warning(f"Purchase order with ID {purchase_id} not found")
        return jsonify({"error": "Purchase order not found"}), 404
    except Exception as e:
        logger.error(f"Error in get_purchase_by_id_api for ID {purchase_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve purchase order"}), 500

@app.route("/api/purchases/<string:purchase_id>/status", methods=["PUT"])
def update_purchase_status_api(purchase_id):
    data = request.get_json()
    logger.info(f"PUT /api/purchases/{purchase_id}/status called with data: {data}")
    if not data or "new_status" not in data:
        logger.warning(f"Update purchase status attempt for {purchase_id} with missing new_status")
        return jsonify({"error": "Missing new_status"}), 400
    try:
        updated_purchase = purchase_service.update_purchase_status(purchase_id, data["new_status"])
        if updated_purchase:
            logger.info(f"Purchase order {purchase_id} status updated: {updated_purchase}")
            return jsonify(updated_purchase)
        logger.warning(f"Purchase order {purchase_id} not found or status update failed")
        return jsonify({"error": "Purchase order not found or update failed"}), 404
    except Exception as e:
        logger.error(f"Error in update_purchase_status_api for ID {purchase_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update purchase order status"}), 500

# --- Reporting/Analytics APIs ---
@app.route("/api/reports/sales", methods=["GET"])
def get_sales_report_api():
    start_date = request.args.get("start_date", "2024-01-01")
    end_date = request.args.get("end_date", "2024-12-31")
    group_by = request.args.get("group_by")
    logger.info(f"GET /api/reports/sales called with params: start_date={start_date}, end_date={end_date}, group_by={group_by}")
    try:
        report = generate_sales_report(start_date, end_date, group_by)
        return jsonify(report)
    except Exception as e:
        logger.error(f"Error in get_sales_report_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to generate sales report"}), 500

@app.route("/api/reports/inventory", methods=["GET"])
def get_inventory_report_api():
    as_of_date = request.args.get("as_of_date", "2024-12-31")
    low_stock_threshold_str = request.args.get("low_stock_threshold")
    low_stock_threshold = int(low_stock_threshold_str) if low_stock_threshold_str else None
    logger.info(f"GET /api/reports/inventory called with params: as_of_date={as_of_date}, low_stock_threshold={low_stock_threshold}")
    try:
        report = generate_inventory_report(as_of_date, low_stock_threshold)
        return jsonify(report)
    except Exception as e:
        logger.error(f"Error in get_inventory_report_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to generate inventory report"}), 500

@app.route("/api/reports/purchases", methods=["GET"])
def get_purchase_report_api():
    start_date = request.args.get("start_date", "2024-01-01")
    end_date = request.args.get("end_date", "2024-12-31")
    group_by_supplier_str = request.args.get("group_by_supplier", "false")
    group_by_supplier = group_by_supplier_str.lower() == "true"
    logger.info(f"GET /api/reports/purchases called with params: start_date={start_date}, end_date={end_date}, group_by_supplier={group_by_supplier}")
    try:
        report = generate_purchase_report(start_date, end_date, group_by_supplier)
        return jsonify(report)
    except Exception as e:
        logger.error(f"Error in get_purchase_report_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to generate purchase report"}), 500

# --- Accounting APIs ---
@app.route("/api/accounting/chart-of-accounts", methods=["GET"])
def get_chart_of_accounts_api():
    logger.info("GET /api/accounting/chart-of-accounts called")
    try:
        accounts = accounting_service.get_chart_of_accounts()
        return jsonify(accounts)
    except Exception as e:
        logger.error(f"Error in get_chart_of_accounts_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve chart of accounts"}), 500

@app.route("/api/accounting/chart-of-accounts", methods=["POST"])
def add_account_api():
    data = request.get_json()
    logger.info(f"POST /api/accounting/chart-of-accounts called with data: {data}")
    if not data or not all(k in data for k in ("account_id", "account_name", "account_type")):
        logger.warning("Add account attempt with missing data")
        return jsonify({"error": "Missing account_id, account_name, or account_type"}), 400
    try:
        result = accounting_service.add_account(data["account_id"], data["account_name"], data["account_type"])
        if "error" in result:
            logger.error(f"Error adding account: {result['error']}")
            return jsonify(result), 400
        logger.info(f"Account added: {result}")
        return jsonify(result), 201
    except Exception as e:
        logger.error(f"Error in add_account_api: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/accounting/journal-entries", methods=["GET"])
def get_journal_entries_api():
    logger.info("GET /api/accounting/journal-entries called")
    try:
        entries = accounting_service.get_all_journal_entries()
        return jsonify(entries)
    except Exception as e:
        logger.error(f"Error in get_journal_entries_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve journal entries"}), 500

@app.route("/api/accounting/journal-entries", methods=["POST"])
def create_journal_entry_api():
    data = request.get_json()
    logger.info(f"POST /api/accounting/journal-entries called with data: {data}")
    if not data or not all(k in data for k in ("date", "description", "lines")):
        logger.warning("Create journal entry attempt with missing data")
        return jsonify({"error": "Missing date, description, or lines for journal entry"}), 400
    try:
        result = accounting_service.create_journal_entry(data["date"], data["description"], data["lines"])
        if "error" in result:
            logger.error(f"Error creating journal entry: {result['error']}")
            return jsonify(result), 400
        logger.info(f"Journal entry created: {result}")
        return jsonify(result), 201
    except Exception as e:
        logger.error(f"Error in create_journal_entry_api: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/accounting/journal-entries/<string:entry_id>", methods=["GET"])
def get_journal_entry_by_id_api(entry_id):
    logger.info(f"GET /api/accounting/journal-entries/{entry_id} called")
    try:
        entry = accounting_service.get_journal_entry_by_id(entry_id)
        if entry:
            return jsonify(entry)
        logger.warning(f"Journal entry with ID {entry_id} not found")
        return jsonify({"error": "Journal entry not found"}), 404
    except Exception as e:
        logger.error(f"Error in get_journal_entry_by_id_api for ID {entry_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve journal entry"}), 500

@app.route("/api/accounting/reports/trial-balance", methods=["GET"])
def get_trial_balance_api():
    as_of_date = request.args.get("as_of_date", "2024-12-31") # Example default
    logger.info(f"GET /api/accounting/reports/trial-balance called with as_of_date: {as_of_date}")
    try:
        report = accounting_service.generate_trial_balance(as_of_date)
        return jsonify(report)
    except Exception as e:
        logger.error(f"Error in get_trial_balance_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to generate trial balance"}), 500

@app.route("/api/accounting/reports/income-statement", methods=["GET"])
def get_income_statement_api():
    start_date = request.args.get("start_date", "2024-01-01")
    end_date = request.args.get("end_date", "2024-12-31")
    logger.info(f"GET /api/accounting/reports/income-statement called with start_date: {start_date}, end_date: {end_date}")
    try:
        report = accounting_service.generate_income_statement(start_date, end_date)
        return jsonify(report)
    except Exception as e:
        logger.error(f"Error in get_income_statement_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to generate income statement"}), 500

@app.route("/api/accounting/reports/balance-sheet", methods=["GET"])
def get_balance_sheet_api():
    as_of_date = request.args.get("as_of_date", "2024-12-31")
    logger.info(f"GET /api/accounting/reports/balance-sheet called with as_of_date: {as_of_date}")
    try:
        report = accounting_service.generate_balance_sheet(as_of_date)
        return jsonify(report)
    except Exception as e:
        logger.error(f"Error in get_balance_sheet_api: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to generate balance sheet"}), 500

if __name__ == "__main__":
    port = int(os.getenv("APP_PORT", 8000))
    debug_mode = os.getenv("DEBUG", "False").lower() == "true"
    # Set Flask app logger level based on debug_mode, if not already set by basicConfig
    if not debug_mode:
        app.logger.setLevel(logging.INFO)
    else:
        app.logger.setLevel(logging.DEBUG)
    
    logger.info(f"Starting ERP Backend API Server on port {port} with debug_mode={debug_mode}")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)

