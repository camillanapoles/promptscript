#!/usr/bin/env bash
# Thin wrapper: all logic lives in run-eval.mjs.
#
# Usage:
#   bash evals/run-eval.sh                    # repo checkout (CI runs this)
#   PRS_CMD=<installed-prs> bash evals/run-eval.sh
set -euo pipefail
exec node "$(dirname "$0")/run-eval.mjs" "$@"
