# Makefile for downloading and generating gRPC TypeScript code

# Variables
PROTOC = protoc
PROTOC_GEN_TS_PROTO = ./node_modules/.bin/protoc-gen-ts_proto
PROTO_DIR = ./protos
GENERATED_DIR = src/generated/grpc

# Default target - clean and regenerate everything
.PHONY: all
all: clean generate

# Clean generated files and downloaded protos
.PHONY: clean
clean:
	@echo "Cleaning generated files and protos..."
	@rm -rf $(GENERATED_DIR)

# Generate TypeScript files from protos
.PHONY: generate
generate:
	@echo "Generating TypeScript files with ts-proto..."
	@mkdir -p $(GENERATED_DIR)
	@if ! [ -x "$(PROTOC_GEN_TS_PROTO)" ]; then \
		echo "Error: protoc-gen-ts_proto not found. Run: npm install ts-proto"; \
		exit 1; \
	fi
	@$(PROTOC) \
		--plugin="protoc-gen-ts_proto=$(PROTOC_GEN_TS_PROTO)" \
		--ts_proto_out="$(GENERATED_DIR)" \
		--ts_proto_opt="esModuleInterop=true,forceLong=string,useOptionals=messages,outputClientImpl=grpc-web" \
		-I $(PROTO_DIR) \
		$(PROTO_DIR)/**/*.proto
	@echo "TypeScript files generated in $(GENERATED_DIR)"

# Install ts-proto if not present
.PHONY: install-deps
install-deps:
	@echo "Installing ts-proto..."
	@npm install --save-dev ts-proto
	@echo "ts-proto installed successfully"
