#!/usr/bin/env bash
set -Eeuo pipefail

# Start the same Functions Framework service used by the old local setup.
# Keep this terminal open, then run the suite with --endpoint-url.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../therapy-analysis-function"
CONDA_ENVIRONMENT="${THERASSIST_CONDA_ENV:-TherAssist}"
PORT_NUMBER="${THERASSIST_PORT:-8080}"

command -v conda >/dev/null 2>&1 || {
  echo "conda was not found on PATH" >&2
  exit 1
}

# The host environment may define DEBUG=release, which Functions Framework
# interprets as the boolean --debug option's value.
unset DEBUG

cd "${BACKEND_DIR}"
if [[ "${THERASSIST_DEBUG:-0}" == "1" ]]; then
  exec conda run --no-capture-output -n "${CONDA_ENVIRONMENT}" \
    functions-framework --target=therapy_analysis --debug --port="${PORT_NUMBER}"
fi
exec conda run --no-capture-output -n "${CONDA_ENVIRONMENT}" \
  functions-framework --target=therapy_analysis --port="${PORT_NUMBER}"
