#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENDPOINT_URL="${1:-http://127.0.0.1:8090/therapy_analysis}"
OUTPUT_ROOT="${2:-${SCRIPT_DIR}/results/all_analysis}"

echo "Running all realtime analyses (in-process and service-level)..."
bash "${SCRIPT_DIR}/run_both_realtime_tests.sh" \
  "${ENDPOINT_URL}" \
  "${OUTPUT_ROOT}/realtime"

echo
echo "Running all comprehensive analyses (in-process and service-level)..."
bash "${SCRIPT_DIR}/run_both_comprehensive_tests.sh" \
  "${ENDPOINT_URL}" \
  "${OUTPUT_ROOT}/comprehensive"

echo
echo "All realtime and comprehensive analyses completed."
echo "Realtime reports: ${OUTPUT_ROOT}/realtime"
echo "Comprehensive reports: ${OUTPUT_ROOT}/comprehensive"
