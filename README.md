# Policy Machine Admin

Admin UI for managing NGAC policies. Uses gRPC-Web with Envoy proxy.

## Prerequisites

- Node.js 20+
- Docker

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Envoy gRPC proxy:
   ```bash
   docker run -d -p 8888:8888 \
     -v $(pwd)/grpc-proxy/envoy.yaml:/etc/envoy/envoy.yaml:ro \
     envoyproxy/envoy:v1.31-latest \
     -c /etc/envoy/envoy.yaml
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173

## Docker Deployment

1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

2. Start services:
   ```bash
   docker-compose up -d
   ```

3. Open http://localhost:4173

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FRONTEND_PORT` | Frontend container port | 4173 |
| `GRPC_PROXY_PORT` | Envoy proxy port | 8888 |
| `PM_ADMIN_GRPC_PROXY_HOST` | Proxy hostname for frontend | localhost |
| `PM_ADMIN_GRPC_PROXY_PORT` | Proxy port for frontend | 8888 |

## gRPC Backend

Envoy forwards requests to `host.docker.internal:9090`. Update `grpc-proxy/envoy.yaml` to point to your Policy Machine gRPC server.

## Update Protocol Buffers
```
git submodule update --remote --merge protos
git add protos
git commit -m "Update protos submodule"
git push
```
