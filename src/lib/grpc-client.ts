import { grpc } from '@improbable-eng/grpc-web';
import { AuthService } from './auth';

// Environment variables for gRPC proxy configuration
// The proxy will handle the translation from gRPC-Web to native gRPC
const GRPC_PROXY_HOST = import.meta.env.PM_ADMIN_GRPC_PROXY_HOST || 'localhost';
const GRPC_PROXY_PORT = import.meta.env.PM_ADMIN_GRPC_PROXY_PORT || '8888';

// gRPC client configuration pointing to Envoy proxy
export const grpcConfig = {
  host: `http://${GRPC_PROXY_HOST}:${GRPC_PROXY_PORT}`,
  transport: grpc.CrossBrowserHttpTransport({
    withCredentials: false,
  }),
  debug: import.meta.env.NODE_ENV === 'development',
  timeout: 60000, // 60 second timeout for long-running operations
};

// Default request metadata with authentication
export const getRequestMetadata = (): grpc.Metadata => {
  const metadata = new grpc.Metadata();
  
  // Add auth token as x-pm-user header if user is authenticated
  const username = AuthService.getUsername();
  if (username) {
    metadata.set('x-pm-user', username);
  }
  
  return metadata;
};

// Enhanced error handler for gRPC calls with better user messaging
export const handleGrpcError = (grpcCode: grpc.Code, message: string): Error => {
  console.error(`gRPC Error [${grpcCode}]: ${message}`);

  const error = new Error(message);
  (error as any).cause = { grpcCode, originalMessage: message };

  return error;
}; 