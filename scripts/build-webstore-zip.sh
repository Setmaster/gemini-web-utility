#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(node -p "require('${repo_root}/package.json').version")"
out_dir="${repo_root}/dist"
stage_dir="${out_dir}/gemini-web-utility-${version}"
zip_path="${out_dir}/gemini-web-utility-${version}.zip"

mkdir -p "${out_dir}"
rm -rf "${stage_dir}" "${zip_path}"
mkdir -p "${stage_dir}/icons"

cp "${repo_root}/manifest.json" "${stage_dir}/manifest.json"
cp "${repo_root}/content_script.js" "${stage_dir}/content_script.js"
cp "${repo_root}/service_worker.js" "${stage_dir}/service_worker.js"
cp "${repo_root}"/icons/* "${stage_dir}/icons/"

(
  cd "${stage_dir}"
  zip -qr "${zip_path}" .
)

echo "${zip_path}"
