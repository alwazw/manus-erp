# ERP Database Schema Design

This document outlines the database schema for the ERP system. The schema is designed for PostgreSQL and aims for modularity, scalability, and extensibility.

## Core Principles

*   **Modularity:** Each core ERP module (Products, Sales, Purchases, Inventory, Accounting) will have its own set of related tables.
*   **Normalization:** The schema will be normalized to reduce data redundancy and improve data integrity (aiming for 3NF where practical).
*   **Scalability:** Data types and indexing strategies will be chosen to support future growth in data volume.
*   **Extensibility:** The design will allow for the addition of new modules and features with minimal impact on the existing schema.
*   **SKU as a Central Key:** The `SKU` will be a central identifier linking products across different modules like Sales and Purchases, as per user requirements.

## 1. Products Module

*   **`products` table:** Stores core product information.
    *   `product_id` (SERIAL, PRIMARY KEY)
    *   `sku` (VARCHAR(255), UNIQUE, NOT NULL) - Stock Keeping Unit
    *   `product_name` (VARCHAR(255), NOT NULL)
    *   `description` (TEXT)
    *   `category_id` (INTEGER, FOREIGN KEY references `categories.category_id`)
    *   `unit_price` (DECIMAL(10, 2), NOT NULL) - Selling price
    *   `average_cost` (DECIMAL(10, 2), DEFAULT 0.00) - Average cost of current inventory
    *   `last_purchase_price` (DECIMAL(10, 2))
    *   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
    *   `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
*   **`categories` table:** Stores product categories.
    *   `category_id` (SERIAL, PRIMARY KEY)
    *   `category_name` (VARCHAR(255), UNIQUE, NOT NULL)
    *   `description` (TEXT)
*   **`inventory_levels` table:** Tracks stock quantities for each product.
    *   `inventory_id` (SERIAL, PRIMARY KEY)
    *   `product_id` (INTEGER, FOREIGN KEY references `products.product_id`, UNIQUE)
    *   `available_quantity` (INTEGER, NOT NULL, DEFAULT 0)
    *   `inventory_level_status` (VARCHAR(50), NOT NULL, CHECK (`inventory_level_status` IN ("In Stock", "Low Stock", "Out of Stock"))) - Custom tiers to be configurable
    *   `reorder_point` (INTEGER, DEFAULT 0)
    *   `last_updated` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

## 2. Sales Module

*   **`customers` table:** Stores customer information.
    *   `customer_id` (SERIAL, PRIMARY KEY)
    *   `customer_name` (VARCHAR(255), NOT NULL)
    *   `email` (VARCHAR(255), UNIQUE)
    *   `phone` (VARCHAR(50))
    *   `address_line1` (VARCHAR(255))
    *   `address_line2` (VARCHAR(255))
    *   `city` (VARCHAR(100))
    *   `state_province` (VARCHAR(100))
    *   `postal_code` (VARCHAR(20))
    *   `country` (VARCHAR(100))
    *   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
*   **`sales_orders` table:** Stores information about sales orders.
    *   `order_id` (SERIAL, PRIMARY KEY)
    *   `order_number` (VARCHAR(255), UNIQUE, NOT NULL) - User-friendly order identifier
    *   `customer_id` (INTEGER, FOREIGN KEY references `customers.customer_id`)
    *   `order_date` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
    *   `total_amount` (DECIMAL(12, 2), NOT NULL)
    *   `status` (VARCHAR(50), NOT NULL, DEFAULT "Pending") - e.g., Pending, Processed, Shipped, Delivered, Cancelled
    *   `shipping_address_line1` (VARCHAR(255))
    *   `shipping_address_line2` (VARCHAR(255))
    *   `shipping_city` (VARCHAR(100))
    *   `shipping_state_province` (VARCHAR(100))
    *   `shipping_postal_code` (VARCHAR(20))
    *   `shipping_country` (VARCHAR(100))
    *   `notes` (TEXT)
*   **`sales_order_items` table:** Stores individual items within a sales order.
    *   `order_item_id` (SERIAL, PRIMARY KEY)
    *   `order_id` (INTEGER, FOREIGN KEY references `sales_orders.order_id`)
    *   `product_id` (INTEGER, FOREIGN KEY references `products.product_id`)
    *   `sku` (VARCHAR(255), NOT NULL) - Copied for historical record, links to `products.sku`
    *   `quantity` (INTEGER, NOT NULL)
    *   `unit_price` (DECIMAL(10, 2), NOT NULL) - Price at the time of sale
    *   `line_total` (DECIMAL(12, 2), NOT NULL)

## 3. Purchase Management Module

*   **`suppliers` table:** Stores supplier information.
    *   `supplier_id` (SERIAL, PRIMARY KEY)
    *   `supplier_name` (VARCHAR(255), NOT NULL)
    *   `contact_name` (VARCHAR(255))
    *   `email` (VARCHAR(255), UNIQUE)
    *   `phone` (VARCHAR(50))
    *   `address_line1` (VARCHAR(255))
    *   `city` (VARCHAR(100))
    *   `country` (VARCHAR(100))
    *   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
*   **`purchase_orders` table:** Stores information about purchase orders.
    *   `po_id` (SERIAL, PRIMARY KEY)
    *   `po_number` (VARCHAR(255), UNIQUE, NOT NULL)
    *   `supplier_id` (INTEGER, FOREIGN KEY references `suppliers.supplier_id`)
    *   `order_date` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
    *   `expected_delivery_date` (TIMESTAMP)
    *   `total_amount` (DECIMAL(12, 2), NOT NULL)
    *   `status` (VARCHAR(50), NOT NULL, DEFAULT "Pending") - e.g., Pending, Ordered, Received, Cancelled
    *   `notes` (TEXT)
*   **`purchase_order_items` table:** Stores individual items within a purchase order.
    *   `po_item_id` (SERIAL, PRIMARY KEY)
    *   `po_id` (INTEGER, FOREIGN KEY references `purchase_orders.po_id`)
    *   `product_id` (INTEGER, FOREIGN KEY references `products.product_id`)
    *   `sku` (VARCHAR(255), NOT NULL) - Links to `products.sku`
    *   `quantity` (INTEGER, NOT NULL)
    *   `unit_cost` (DECIMAL(10, 2), NOT NULL)
    *   `line_total` (DECIMAL(12, 2), NOT NULL)

## 4. Reporting and Analytics (Placeholder - to be detailed further)

This section will be expanded with specific tables or views required for intelligent reporting and data slicing/dicing. This might involve denormalized tables or materialized views for performance.

## 5. Users and Permissions (Placeholder)

*   **`users` table**
*   **`roles` table**
*   **`user_roles` table**
*   **`permissions` table**
*   **`role_permissions` table**

This schema provides a foundation. Further details and refinements will be added during the development process, especially for the reporting/analytics and accounting modules.
