#!/usr/bin/env bash
# Sync proto files from a local NVIDIA OpenShell checkout.
#
# Usage: ./scripts/sync-protos.sh /path/to/OpenShell
#
# After syncing, regenerate TypeScript:
#   ./scripts/generate-protos.sh

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-openshell-repo>"
  echo ""
  echo "Example:"
  echo "  $0 ~/Code/OpenShell"
  echo ""
  echo "This copies the latest .proto files from the OpenShell repo"
  echo "into proto/ and then regenerates the TypeScript bindings."
  exit 1
fi

OPENSHELL_DIR="$1"
PROTO_SRC="${OPENSHELL_DIR}/api/proto"

if [ ! -d "${PROTO_SRC}" ]; then
  echo "Error: ${PROTO_SRC} does not exist."
  echo "Make sure the path points to a valid OpenShell checkout."
  exit 1
fi

echo "Syncing proto files from ${PROTO_SRC}..."
cp "${PROTO_SRC}/openshell.proto" proto/
cp "${PROTO_SRC}/datamodel.proto" proto/
cp "${PROTO_SRC}/sandbox.proto" proto/

echo "Proto files synced. Run ./scripts/generate-protos.sh to regenerate TypeScript."
