# Production Deployment Instructions for ERP System

This document outlines key considerations and steps for deploying the ERP system to a production environment. It builds upon the Docker Compose setup detailed in the main `README.md` but focuses on production-specific aspects.

## 1. Prerequisites and Environment Setup

*   **Dedicated Server/VM or Kubernetes Cluster:** A production environment typically requires more robust infrastructure than a local Docker setup. This could be one or more dedicated servers, Virtual Machines (VMs) in a cloud provider (AWS, Azure, GCP), or a Kubernetes cluster.
*   **Operating System:** A stable Linux distribution (e.g., Ubuntu LTS, CentOS Stream, RHEL) is recommended for servers/VMs.
*   **Docker and Docker Compose:** Ensure Docker Engine and Docker Compose (v2.x+) are installed and configured correctly on the host(s).
*   **Network Configuration:**
    *   Static IP addresses or resolvable hostnames for servers.
    *   Firewall rules configured to allow traffic on necessary ports (e.g., 80/443 for web access, database ports if accessed externally from the app server).
    *   DNS records pointing your domain(s) to the public IP address of the load balancer or server hosting the frontend/backend.
*   **Security Hardening:** Apply security best practices to the host OS, Docker daemon, and all running services.

## 2. Configuration for Production

### 2.1. Environment Variables (`.env` file)

*   **`DEBUG=False`**: Ensure the `DEBUG` variable for the Flask backend application is set to `False` in the `.env` file for production. This disables debug mode, which is insecure for live environments.
*   **Secrets Management:** For sensitive information like `POSTGRES_PASSWORD`, API keys, etc., use a proper secrets management solution (e.g., HashiCorp Vault, AWS Secrets Manager, Kubernetes Secrets) instead of plain text in the `.env` file if possible. If using `.env`, ensure its permissions are highly restricted.
*   **`NEXT_PUBLIC_API_BASE_URL`**: Ensure this points to the publicly accessible URL of your backend API service, not `localhost`.
*   **Database URL:** Ensure `DATABASE_URL` uses the correct production database host, credentials, and database name.
*   **Session Management & Security Keys (Flask):** For Flask applications, ensure `SECRET_KEY` is set to a strong, unique random value for session management and cryptographic signing. This should be managed as a secret.

### 2.2. Docker Compose (`docker-compose.yml`)

*   **Persistent Volumes:** For services like PostgreSQL (`db`) and Grafana, ensure that volumes are configured to use persistent storage on the host or a network-attached storage solution. This prevents data loss if containers are restarted or recreated. Example for PostgreSQL:
    ```yaml
    services:
      db:
        # ... other configurations ...
        volumes:
          - postgres_data:/var/lib/postgresql/data
    volumes:
      postgres_data: # This defines a named volume managed by Docker
        # driver: local # or a specific driver for cloud storage if applicable
    ```
*   **Resource Limits:** Define resource limits (CPU, memory) for containers in `docker-compose.yml` to prevent any single service from consuming all host resources. Example:
    ```yaml
    services:
      app:
        # ... other configurations ...
        deploy:
          resources:
            limits:
              cpus: '1.0'
              memory: '1G'
            reservations:
              cpus: '0.5'
              memory: '512M'
    ```
*   **Restart Policies:** Set appropriate restart policies (e.g., `unless-stopped` or `always`) for critical services to ensure they automatically restart after a crash or server reboot.
    ```yaml
    services:
      app:
        restart: unless-stopped
      db:
        restart: unless-stopped
    ```
*   **Logging:** Configure logging drivers for containers to send logs to a centralized logging system (e.g., ELK stack, Splunk, CloudWatch Logs) for easier monitoring and troubleshooting in production.

## 3. Building and Deploying Images

*   **Optimized Dockerfiles:** Ensure `Dockerfile` for the backend (`app`) and any custom frontend images are optimized for production (e.g., multi-stage builds, minimizing layers, removing build dependencies).
*   **Image Registry:** Push your built Docker images to a private Docker registry (e.g., Docker Hub private repos, AWS ECR, Google Artifact Registry, Azure Container Registry) for secure storage and versioning.
*   **Deployment Strategy:**
    *   **Single Server:** Pull images from the registry and use `docker-compose up -d`.
    *   **Kubernetes:** Use Kubernetes manifests (Deployments, Services, Ingress, ConfigMaps, Secrets, PersistentVolumeClaims) to deploy your containerized application.

## 4. Web Server and Reverse Proxy (e.g., Nginx, Traefik, Caddy)

It is highly recommended to run a reverse proxy in front of your frontend (Next.js) and backend (Flask) applications.

*   **Benefits:**
    *   **SSL/TLS Termination:** Handle HTTPS encryption/decryption.
    *   **Load Balancing:** Distribute traffic if you have multiple instances of your application.
    *   **Caching:** Cache static assets to improve performance.
    *   **Security:** Add security headers, rate limiting, WAF capabilities.
    *   **Serving Static Files:** Efficiently serve static assets for the frontend.
    *   **Path-based Routing:** Route requests to different services (e.g., `/api` to backend, `/` to frontend).
*   **Configuration Example (Conceptual Nginx):**
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com;
        # Redirect HTTP to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        # Include other SSL hardening parameters

        location / {
            proxy_pass http://localhost:3003; # Assuming Next.js frontend runs on port 3003
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/ {
            proxy_pass http://localhost:8000/api/; # Assuming Flask backend runs on port 8000
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
*   **SSL Certificates:** Obtain SSL certificates (e.g., using Let's Encrypt with Certbot) for HTTPS.

## 5. Database Setup for Production

*   **Managed Database Service:** Consider using a managed database service (e.g., AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL) for production. These services handle backups, patching, scaling, and high availability.
*   **Backups:** Implement regular automated backups of your PostgreSQL database. Test restore procedures.
*   **Connection Pooling:** Configure connection pooling for the backend application to efficiently manage database connections.
*   **Security:** Restrict database access to only necessary hosts/IPs. Use strong, unique passwords for database users.

## 6. Monitoring and Logging

*   **Application Performance Monitoring (APM):** Integrate APM tools (e.g., Sentry, Datadog, New Relic) to monitor application performance, errors, and transactions.
*   **Infrastructure Monitoring:** Monitor server/VM/cluster health (CPU, memory, disk, network) using tools like Prometheus & Grafana, Datadog, or cloud provider monitoring services.
*   **Log Aggregation:** As mentioned, centralize logs from all services.
*   **Alerting:** Set up alerts for critical errors, performance degradation, or resource exhaustion.

## 7. Backup and Recovery Strategy

*   **Database Backups:** (Covered above)
*   **Application Code & Configuration:** Ensure your codebase (Git) and deployment configurations (Docker Compose files, Kubernetes manifests, `.env` files - securely stored) are backed up.
*   **Persistent Volumes:** If using host-based persistent volumes, ensure these are part of your server backup strategy.
*   **Disaster Recovery Plan:** Document a disaster recovery plan outlining steps to restore service in case of major failure.

## 8. Security Considerations

*   **Regular Updates:** Keep the host OS, Docker, all container base images, and application dependencies updated with security patches.
*   **Network Segmentation:** Isolate services as much as possible.
*   **Principle of Least Privilege:** Ensure containers and application processes run with the minimum necessary permissions.
*   **Web Application Firewall (WAF):** Consider using a WAF to protect against common web exploits.
*   **Security Scans:** Regularly scan your Docker images and application code for vulnerabilities.

## 9. Deployment Process (High-Level)

1.  **Prepare Production Environment:** Set up servers/cluster, network, security, database.
2.  **Configure Secrets & Environment Variables:** Securely set up production configurations.
3.  **Build & Push Docker Images:** Build production-ready images and push them to your private registry.
4.  **Deploy Reverse Proxy:** Configure and deploy your reverse proxy (e.g., Nginx).
5.  **Deploy Application Services:**
    *   Using Docker Compose: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d` (if using a separate production override file).
    *   Using Kubernetes: `kubectl apply -f <your-kubernetes-manifests-dir>`.
6.  **Database Migrations (if applicable):** Run any necessary database schema migrations.
7.  **Testing:** Perform thorough testing in the production environment (smoke tests, functional tests).
8.  **Monitoring:** Ensure monitoring and alerting are active.

This guide provides a starting point. Specific deployment steps will vary based on your chosen infrastructure and tools.

