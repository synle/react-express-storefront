#!/usr/bin/env bash
# Format backend + frontend JS/TS sources with Prettier.
set -euo pipefail
cd "$(dirname "$0")"
npx --yes prettier@3.3.3 --write \
  'backend/**/*.{js,jsx,ts,tsx,json}' \
  'frontend/src/**/*.{js,jsx,ts,tsx,css,html,json}' \
  'frontend/*.{json,html,js,ts}' \
  '*.{json,md}'
