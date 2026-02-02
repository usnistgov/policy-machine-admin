import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  // Expose PM_ prefixed env vars to the client (instead of default VITE_)
  envPrefix: 'PM_',
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      // Map TypeScript imports to JavaScript files for gRPC services
      '@/generated/grpc/pdp_query_pb_service': '/src/generated/grpc/pdp_query_pb_service.js',
      '@/generated/grpc/pdp_adjudication_pb_service': '/src/generated/grpc/pdp_adjudication_pb_service.js',
      '@/generated/grpc/epp_pb_service': '/src/generated/grpc/epp_pb_service.js',
      // Map protobuf message imports to JavaScript files
      '@/generated/grpc/pdp_query_pb': '/src/generated/grpc/pdp_query_pb.js',
      '@/generated/grpc/pdp_adjudication_pb': '/src/generated/grpc/pdp_adjudication_pb.js',
      '@/generated/grpc/model_pb': '/src/generated/grpc/model_pb.js',
      '@/generated/grpc/epp_pb': '/src/generated/grpc/epp_pb.js',
    }
  },
  optimizeDeps: {
    include: [
      '@improbable-eng/grpc-web',
      'google-protobuf'
    ]
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  },
});
