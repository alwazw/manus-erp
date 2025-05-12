# ERP System - Comprehensive Guide

## 1. Introduction

This document provides a comprehensive guide to the ERP (Enterprise Resource Planning) system. This system is designed to help businesses manage core operations including Product Management, Sales, Purchases, Accounting, and Reporting/Analytics.

**Key Features:**

*   **Modular Design:** Core functionalities are built as independent modules.
*   **Product Management:** Add, update, and manage products, SKUs, categories, and inventory levels.
*   **Sales Management:** Record sales transactions, link to inventory, and manage order statuses.
*   **Purchase Management:** Record purchase orders, link to inventory, and manage supplier interactions.
*   **Accounting Module:** Manage Chart of Accounts, record Journal Entries, and prepare for financial reporting.
*   **Reporting & Analytics:** Generate reports for sales, inventory, purchases, and basic financial statements.
*   **Technology Stack:**
    *   **Backend:** Python (Flask) providing RESTful APIs.
    *   **Frontend:** Next.js (React/TypeScript) for a modern, user-friendly interface.
    *   **Database:** PostgreSQL for robust data storage.
    *   **Containerization:** Docker and Docker Compose for easy deployment and management of services.
    *   **Supporting Services:** Redis (caching/messaging), Adminer (database admin), Grafana (monitoring), Homepage (dashboard).

## 2. Getting Started

### 2.1. System Requirements

*   Docker Engine
*   Docker Compose (v2.x recommended)
*   Web Browser (Chrome, Firefox, Edge, Safari - latest versions)
*   Internet Connection (for initial setup and some external resources if any)

### 2.2. Installation and Setup (using Docker Compose)

1.  **Clone the Project (if applicable) or ensure all project files are in a single directory `/home/ubuntu/erp_project/`**.
    The project directory should contain:
    *   `docker-compose.yml`
    *   `.env` (you will need to create this from `.env.example` if provided, or use the one generated)
    *   `Dockerfile` (for the backend app)
    *   `requirements.txt` (for backend Python dependencies)
    *   `src/` (directory containing backend Python code)
    *   `frontend/` (directory containing the Next.js frontend application)
    *   `homepage_config/` (directory for Homepage dashboard configuration)

2.  **Environment Configuration (`.env` file):**
    Create a `.env` file in the root of the project (`/home/ubuntu/erp_project/.env`) with the following variables (adjust values as needed):

    ```env
    # Backend Application Configuration
    APP_PORT=8000
    DEBUG=True # Set to False in production

    # PostgreSQL Configuration
    POSTGRES_DB=erp_db
    POSTGRES_USER=erp_user
    POSTGRES_PASSWORD=erp_password
    DB_HOST=db # This is the service name in docker-compose.yml
    DB_PORT=5432
    DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_HOST}:${DB_PORT}/${POSTGRES_DB}

    # Redis Configuration
    REDIS_HOST=redis # Service name in docker-compose.yml
    REDIS_PORT=6379

    # Frontend API Configuration (if frontend needs to know the backend URL at build time)
    # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api # For local development
    # For deployed environment, this might be the public URL of the backend
    NEXT_PUBLIC_API_BASE_URL=https://8000-i1jw0jt177c5dg1c3058t-998d4a31.manus.computer/api

    # Grafana Configuration (Optional - if you need to pass specific env vars)
    # GF_SECURITY_ADMIN_USER=admin
    # GF_SECURITY_ADMIN_PASSWORD=grafana
    ```

3.  **Build and Start Services:**
    Open a terminal in the project root directory (`/home/ubuntu/erp_project/`) and run:
    ```bash
    docker-compose up -d --build
    ```
    This command will build the images (if they don_t exist or if `Dockerfile` changed) and start all services defined in `docker-compose.yml` in detached mode.

4.  **Accessing Services:**
    Once the services are up and running:
    *   **ERP Frontend (Next.js):** `http://localhost:3003` (or the port it successfully binds to, check `docker-compose logs frontend` or the exposed port if deployed publicly, e.g., `https://3003-i1jw0jt177c5dg1c3058t-998d4a31.manus.computer`)
    *   **ERP Backend API (Flask):** `http://localhost:8000` (or the publicly exposed port, e.g., `https://8000-i1jw0jt177c5dg1c3058t-998d4a31.manus.computer`)
    *   **Adminer (Database Management):** `http://localhost:8080`
    *   **Grafana (Monitoring):** `http://localhost:3000` (Default credentials: admin/admin, unless changed in `.env` or Grafana config)
    *   **Homepage (Dashboard):** `http://localhost:3001`
    *   **PostgreSQL:** Accessible internally by other containers on port `5432` (service name `db`).
    *   **Redis:** Accessible internally by other containers on port `6379` (service name `redis`).

### 2.3. Initial Setup (Post-Installation)

*   **Database Initialization:** The backend application is designed to work with the PostgreSQL database. No manual schema creation is typically needed as it uses in-memory data structures for this version. For a production setup with persistent data, database migrations would be managed by the backend application upon startup or via a migration tool.
*   **Homepage Configuration:** To customize the Homepage dashboard, edit the configuration files in the `./homepage_config` directory. Refer to the [Homepage documentation](https://gethomepage.dev/latest/configs/) for details.
*   **Grafana Configuration:** Log in to Grafana and configure data sources (e.g., PostgreSQL, Prometheus if added) and dashboards as needed.

## 3. Core Modules - User Guide

### 3.1. Navigating the Frontend

The frontend application provides a main navigation bar to access different modules:
*   **Home:** Dashboard overview.
*   **Products:** Manage product listings.
*   **Sales:** Manage sales orders.
*   **Purchases:** Manage purchase orders.
*   **Reports:** View various system reports.
*   **Accounting:** Manage chart of accounts and journal entries.

### 3.2. Product Management

*   **Viewing Products:** Navigate to the "Products" page to see a list of all products, including SKU, name, category, and inventory status.
*   **Adding a Product (via API):** Currently, adding products is done via API calls to the backend. Example endpoint: `POST /api/products` with JSON body: `{"sku": "PROD004", "name": "New Gadget", "category": "Electronics", "inventory_level_status": "In Stock", "quantity": 50}`.
*   **Updating/Deleting Products (via API):** Similar to adding, these operations are API-driven.

### 3.3. Sales Management

*   **Viewing Sales Orders:** Navigate to the "Sales" page to see a list of sales orders, including customer name, items, total amount, and status.
*   **Recording a Sale (via API):** `POST /api/sales` with JSON body detailing customer, items, and date.

### 3.4. Purchase Management

*   **Viewing Purchase Orders:** Navigate to the "Purchases" page to see a list of purchase orders.
*   **Recording a Purchase (via API):** `POST /api/purchases` with JSON body detailing supplier, items, and date.

### 3.5. Reporting & Analytics

*   **Viewing Reports:** Navigate to the "Reports" page. This section displays basic reports for Sales, Inventory, and Purchases. The data is fetched from the backend API.

### 3.6. Accounting Module

*   **Viewing Chart of Accounts & Journal Entries:** Navigate to the "Accounting" page. This page displays the current Chart of Accounts and recorded Journal Entries.
*   **Adding Accounts/Journal Entries (via API):** `POST /api/accounting/chart-of-accounts` or `POST /api/accounting/journal-entries`.

## 4. Technical Documentation

### 4.1. System Architecture

*   **Frontend:** Next.js application running in a Node.js environment (container `frontend`). Communicates with the backend API.
*   **Backend:** Flask (Python) application providing RESTful APIs (container `app`). Interacts with the PostgreSQL database and Redis.
*   **Database:** PostgreSQL server (container `db`).
*   **Cache/Messaging:** Redis server (container `redis`).
*   **Management Tools:** Adminer, Grafana, Homepage, each in their own containers.
*   All services are orchestrated using Docker Compose.

### 4.2. API Documentation

The backend provides RESTful APIs. Key endpoints include:

*   **Products:** `/api/products` (GET, POST), `/api/products/<sku>` (GET, PUT, DELETE)
*   **Sales:** `/api/sales` (GET, POST), `/api/sales/<order_id>` (GET), `/api/sales/<order_id>/status` (PUT)
*   **Purchases:** `/api/purchases` (GET, POST), `/api/purchases/<purchase_id>` (GET), `/api/purchases/<purchase_id>/status` (PUT)
*   **Reports:** `/api/reports/sales`, `/api/reports/inventory`, `/api/reports/purchases` (GET with query parameters)
*   **Accounting:** `/api/accounting/chart-of-accounts` (GET, POST), `/api/accounting/journal-entries` (GET, POST), `/api/accounting/journal-entries/<entry_id>` (GET), `/api/accounting/reports/...` (GET)

Refer to the backend source code (`src/app.py`) for detailed request/response formats.

### 4.3. Database Schema (PostgreSQL)

For this version, the backend services primarily use in-memory data structures for demonstration. A production-grade system would have a defined PostgreSQL schema with tables for:

*   `products` (sku, name, category, quantity, inventory_level_status, etc.)
*   `sales_orders` (order_id, customer_name, order_date, total_amount, status, etc.)
*   `sales_order_items` (order_item_id, order_id, product_sku, quantity, price, etc.)
*   `purchase_orders` (purchase_id, supplier_name, order_date, total_amount, status, etc.)
*   `purchase_order_items` (item_id, purchase_id, product_sku, quantity, cost_price, etc.)
*   `chart_of_accounts` (account_id, account_name, account_type, balance, etc.)
*   `journal_entries` (entry_id, date, description, etc.)
*   `journal_entry_lines` (line_id, entry_id, account_id, debit_amount, credit_amount, etc.)

Database migrations (e.g., using Alembic with SQLAlchemy) would be used to manage schema changes.

### 4.4. Frontend Application (`frontend/erp_frontend_app`)

*   **Framework:** Next.js 15.x with TypeScript.
*   **Styling:** Tailwind CSS with `globals.css` and utility classes.
*   **UI Components:** Shadcn/UI components (implied by `components.json` and Tailwind setup).
*   **Structure:**
    *   `src/app/`: Contains page routes (e.g., `products/page.tsx`, `sales/page.tsx`).
    *   `src/app/layout.tsx`: Main layout component, imports `globals.css`.
    *   `src/app/globals.css`: Global styles and Tailwind CSS imports.
    *   API calls are made from page components using `fetch` to the backend API.

### 4.5. Backend Application (`src/`)

*   **Framework:** Flask (Python).
*   **Entry Point:** `src/app.py`.
*   **Modules:** Core logic is separated into services within `src/core_modules/` (e.g., `product_service.py`, `sales_service.py`).
*   **Dependencies:** Listed in `requirements.txt`.
*   **Environment Variables:** Configured via `.env` file (see Section 2.2).

## 5. Troubleshooting

*   **Services not starting:** Check `docker-compose logs <service_name>` (e.g., `docker-compose logs app` or `docker-compose logs frontend`).
*   **Frontend shows errors loading data / CSS not applying:**
    *   Ensure `globals.css` is imported in `frontend/erp_frontend_app/src/app/layout.tsx`.
    *   Verify the Next.js development server (`pnpm dev` or `npm run dev` inside the `frontend/erp_frontend_app` directory) is running without errors if testing locally outside Docker for frontend changes.
    *   Ensure the `NEXT_PUBLIC_API_BASE_URL` in the frontend (either hardcoded in API calls or via an environment variable if Next.js is configured to use it) points to the correct backend API URL (e.g., `http://localhost:8000/api` if backend is local, or the public URL if deployed).
*   **Database connection issues (Adminer or backend app):** Verify `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DB_HOST` in the `.env` file and `docker-compose.yml` are consistent.
*   **Port conflicts:** If a service fails to start due to a port already being in use, check which application is using that port on your host machine or modify the port mapping in `docker-compose.yml` (e.g., `"8001:8000"` instead of `"8000:8000"`).

## 6. Next Steps & Future Enhancements

*   **Full CRUD Operations in Frontend:** Implement forms and UI elements for adding, editing, and deleting data in all modules.
*   **User Authentication & Authorization:** Secure the application with user logins and role-based access control.
*   **Persistent Database Schema:** Implement full database schema and migrations for PostgreSQL.
*   **Advanced Reporting & KPIs:** Integrate more sophisticated data visualization and Key Performance Indicators.
*   **Expense Management Module:** Add functionality for tracking business expenses.
*   **Profitability Analysis:** Develop tools to analyze profitability based on sales, COGS, and expenses.
*   **Automated Testing:** Implement comprehensive unit, integration, and end-to-end tests.
*   **Production Deployment Strategy:** Refine deployment for production environments (e.g., using Kubernetes, managed cloud services).

This README provides a starting point. More detailed documentation for each component can be found in their respective directories or linked from here.

