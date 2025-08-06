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
- `MYSQL_AUTH_PLUGIN` (default: mysql_native_password, for compatibility with older MySQL 5.x instances. Set to 'caching_sha2_password' for newer MySQL 8.x+ servers)
- `MYSQL_SSL` (set to 'true' to enable SSL/TLS connections)
- `MYSQL_SSL_REJECT_UNAUTHORIZED` (default: true, set to 'false' to allow self-signed certificates)

### MongoDB

Set these environment variables to enable MongoDB connectivity testing:

- `MONGO_HOST` (required)
- `MONGO_PORT` (default: 27017)
- `MONGO_USER` (optional)
- `MONGO_PASSWORD` (optional)
- `MONGO_DATABASE` (default: test)
- `MONGO_SSL` (set to 'true' to enable SSL/TLS connections)
- `MONGO_SSL_VALIDATE` (default: true, set to 'false' to disable certificate validation)

### Redis

Set these environment variables to enable Redis connectivity testing:

- `REDIS_HOST` (required)
- `REDIS_PORT` (default: 6379)
- `REDIS_PASSWORD` (optional)
- `REDIS_SSL` (set to 'true' to enable SSL/TLS connections)
- `REDIS_SSL_REJECT_UNAUTHORIZED` (default: true, set to 'false' to allow self-signed certificates)

### Connection Status Indicators

- **Connected**: Successful connection with response time
- **Failed**: Connection failed with error details
- **Connecting**: Connection attempt in progress
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

# Run with SSL/TLS enabled databases
docker run -p 3000:3000 \
  -e MYSQL_HOST=mysql-server \
  -e MYSQL_SSL=true \
  -e MONGO_HOST=mongo-server \
  -e MONGO_SSL=true \
  -e REDIS_HOST=redis-server \
  -e REDIS_SSL=true \
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
- **GET /api**: JSON API endpoint returning all system information for monitoring
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

### API Monitoring

The `/api` endpoint returns JSON data perfect for monitoring and automation:

```bash
# Check instance status
curl http://localhost:3000/api | jq .

# Monitor database connections
curl http://localhost:3000/api | jq '.databases'

# Get environment variables
curl http://localhost:3000/api | jq '.environment'

# Check uptime
curl http://localhost:3000/api | jq '.uptime'
```

Example JSON response:

```json
{
  "platform": "linux",
  "hostname": "hello-world-pod-abc123",
  "instance": "550e8400-e29b-41d4-a716-446655440000",
  "colour": "#FF5733",
  "environment": {
    "MYSQL_HOST": "mysql-server",
    "MYSQL_PASSWORD": "AVNS**************r2",
    "NODE_ENV": "production"
  },
  "databases": {
    "mysql": {
      "status": "connected",
      "error": null,
      "lastCheck": "2024-01-15T10:30:45Z",
      "responseTime": 45
    }
  },
  "localTime": "2024-01-15T10:30:45-08:00",
  "utcTime": "2024-01-15T18:30:45Z",
  "uptime": "2 hours"
}
```

## License

ISC
