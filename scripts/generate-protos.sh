#!/usr/bin/env bash
# Generate TypeScript gRPC client code from vendored OpenShell proto files.
# Requires: protoc (brew install protobuf), ts-proto (pnpm devDep)
#
# Usage: ./scripts/generate-protos.sh
# Output: src/generated/

set -euo pipefail

PROTO_DIR="proto"
OUT_DIR="src/generated"

# Ensure output directory exists
mkdir -p "${OUT_DIR}"

# Generate TypeScript from proto files
protoc \
  --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out="${OUT_DIR}" \
  --ts_proto_opt=outputServices=nice-grpc,outputServices=generic-definitions,esModuleInterop=true,useExactTypes=false,importSuffix=.js \
  -I "${PROTO_DIR}" \
  "${PROTO_DIR}/openshell.proto" \
  "${PROTO_DIR}/datamodel.proto" \
  "${PROTO_DIR}/sandbox.proto"

echo "Generated TypeScript gRPC client in ${OUT_DIR}"
