#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CONDA_ENVIRONMENT="${THERASSIST_CONDA_ENV:-TherAssist}"
ENDPOINT_URL="${1:-http://127.0.0.1:8090/therapy_analysis}"
OUTPUT_ROOT="${2:-${SCRIPT_DIR}/results/comprehensive_both}"

if ! command -v conda >/dev/null 2>&1; then
  echo "conda was not found on PATH." >&2
  exit 1
fi

IN_PROCESS_ARGS=(
  --all-dialogues
  --output-dir "${OUTPUT_ROOT}/in_process"
)
SERVICE_ARGS=(
  --all-dialogues
  --endpoint-url "${ENDPOINT_URL}"
  --output-dir "${OUTPUT_ROOT}/service"
)
if [[ -n "${THERASSIST_MAX_DIALOGUES:-}" ]]; then
  IN_PROCESS_ARGS+=(--max-dialogues "${THERASSIST_MAX_DIALOGUES}")
  SERVICE_ARGS+=(--max-dialogues "${THERASSIST_MAX_DIALOGUES}")
fi
if [[ -n "${THERASSIST_BEARER_TOKEN:-}" ]]; then
  SERVICE_ARGS+=(--bearer-token "${THERASSIST_BEARER_TOKEN}")
fi

mkdir -p "${OUTPUT_ROOT}/in_process" "${OUTPUT_ROOT}/service"

echo "Running all dialogues through handle_comprehensive_analysis in-process..."
conda run -n "${CONDA_ENVIRONMENT}" python "${SCRIPT_DIR}/comprehensive_analysis_suite.py" \
  "${IN_PROCESS_ARGS[@]}"

echo
echo "Running all dialogues through the comprehensive service at ${ENDPOINT_URL}..."
conda run -n "${CONDA_ENVIRONMENT}" python "${SCRIPT_DIR}/comprehensive_analysis_suite.py" \
  "${SERVICE_ARGS[@]}"

echo
echo "Both comprehensive-analysis tests completed."
echo "In-process reports: ${OUTPUT_ROOT}/in_process"
echo "Service-level reports: ${OUTPUT_ROOT}/service"
