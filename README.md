# Hello World Container

A predictable Node.js service designed for testing Kubernetes deployments, pod lifecycle management, and environment verification.

## Purpose

This container provides a stable HTTP service that displays system information and environment variables, making it ideal for:

- **Kubernetes Testing**: Verify that pods are running correctly and can access environment variables
- **Pod Lifecycle Testing**: Built-in killswitch endpoints to test pod management and recovery
- **Environment Verification**: Display all environment variables to ensure configuration is correct
- **Load Balancer Testing**: Each instance has a unique ID and colour for easy identification

## Features

- **System Information Display**: Shows hostname, platform, instance ID, and uptime
- **Database Connectivity Testing**: Automatically tests connections to MySQL, MongoDB, and Redis when configured
- **Environment Variables**: Lists all environment variables in sorted order
- **Unique Instance Identification**: Each container gets a UUID and random colour
- **Killswitch Endpoint**: `/state/kill` endpoint for testing pod recovery
- **Live Template Reloading**: Automatically reloads the HTML template when changed
- **Timestamps**: Displays both local and UTC time

## Database Connectivity Testing

The container automatically detects and tests database connections based on environment variables:

### MySQL
Set these environment variables to enable MySQL connectivity testing:
- `MYSQL_HOST` (required)
- `MYSQL_PORT` (default: 3306)
- `MYSQL_USER` (default: root)
- `MYSQL_PASSWORD` (default: empty)
- `MYSQL_DATABASE` (optional)

### MongoDB
Set these environment variables to enable MongoDB connectivity testing:
- `MONGO_HOST` (required)
- `MONGO_PORT` (default: 27017)
- `MONGO_USER` (optional)
- `MONGO_PASSWORD` (optional)
- `MONGO_DATABASE` (default: test)

### Redis
Set these environment variables to enable Redis connectivity testing:
- `REDIS_HOST` (required)
- `REDIS_PORT` (default: 6379)
- `REDIS_PASSWORD` (optional)

### Connection Status Indicators
- ✅ **Connected**: Successful connection with response time
- ❌ **Failed**: Connection failed with error details
- ⏳ **Connecting**: Connection attempt in progress
- Database section is hidden when no databases are configured

## Usage

### Running Locally

```bash
npm install
node app.js
```

The service runs on port 3000 by default (configurable via `PORT` environment variable).

### Docker

```bash
# Build
docker build -t hello-world .

# Run
docker run -p 3000:3000 hello-world

# Run with database testing
docker run -p 3000:3000 \
  -e MYSQL_HOST=mysql-server \
  -e MONGO_HOST=mongo-server \
  -e REDIS_HOST=redis-server \
  hello-world
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-world
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello-world
  template:
    metadata:
      labels:
        app: hello-world
    spec:
      containers:
        - name: hello-world
          image: pacosystems/hello-world:latest
          ports:
            - containerPort: 3000
          env:
            - name: ENVIRONMENT
              value: "production"
            - name: MYSQL_HOST
              value: "mysql-service"
            - name: REDIS_HOST
              value: "redis-service"
```

## Endpoints

- **GET /**: Main page displaying system information and environment variables
- **GET /state/kill**: Triggers graceful shutdown (sends SIGINT to process)

## Environment Variables

- `PORT`: Server port (default: 3000)
- All other environment variables are displayed on the main page

## Pod Lifecycle Testing

The `/state/kill` endpoint is designed for testing Kubernetes pod recovery:

1. Deploy multiple replicas of this container
2. Call `/state/kill` on one instance
3. Watch Kubernetes restart the pod
4. Verify load balancer redistributes traffic

This helps validate:

- Pod restart policies
- Service discovery
- Load balancer health checks
- Application resilience
- Database connectivity and failover scenarios

## Monitoring and Health Checks

- Database connections are tested every 30 seconds automatically
- Connection timeouts are set to 5 seconds for quick failure detection
- All connection attempts include response time measurements
- Failed connections display specific error messages for troubleshooting

## Dependencies

- Node.js 20.11.1 (Alpine Linux)
- Handlebars for templating
- Moment.js for time formatting
- UUID for unique instance identification
- randomcolor for visual differentiation
- mysql2 for MySQL connectivity testing
- mongodb for MongoDB connectivity testing
- redis for Redis connectivity testing

## License

ISC
