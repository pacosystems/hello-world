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
- **Environment Variables**: Lists all environment variables in sorted order
- **Unique Instance Identification**: Each container gets a UUID and random colour
- **Killswitch Endpoint**: `/state/kill` endpoint for testing pod recovery
- **Live Template Reloading**: Automatically reloads the HTML template when changed
- **Timestamps**: Displays both local and UTC time

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

## Dependencies

- Node.js 20.11.1 (Alpine Linux)
- Handlebars for templating
- Moment.js for time formatting
- UUID for unique instance identification
- randomcolor for visual differentiation

## License

ISC
