#!/usr/bin/env bash
# Actualiza la tienda (LewoskiShop) con el catálogo exportado de WhatsApp
# contenido en el ZIP descomprimido (carpeta con items.json/csv + images/).
#
# Uso:
#   ./scripts/actualizar-catalogo-wa-zip.sh [RUTA_ZIP_EXTRAIDO] [--mode merge|replace] [--dry-run] [--build]
#
# Ejemplos:
#   ./scripts/actualizar-catalogo-wa-zip.sh /tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski
#   ./scripts/actualizar-catalogo-wa-zip.sh /tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski --mode replace --build
#
# Por defecto: usa /tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski, modo merge.
#   --mode replace  borra src/content/products/*.json antes de importar
#   --mode merge    conserva productos existentes (omite slugs ya presentes)
#   --dry-run       no escribe archivos
#   --build         ejecuta npm run build al finalizar (si no es dry-run)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

SRC_DEFAULT="/tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski"
SRC=""
MODE="merge"
DRY=""
BUILD="0"

for a in "$@"; do
  case "$a" in
    --mode) shift_next=mode ;;
    merge|replace) if [ "${shift_next:-}" = "mode" ]; then MODE="$a"; shift_next=""; else SRC="$a"; fi ;;
    --dry-run) DRY="--dry-run" ;;
    --build) BUILD="1" ;;
    --help|-h) sed -n '2,20p' "$0"; exit 0 ;;
    *) if [ "${shift_next:-}" = "mode" ]; then MODE="$a"; shift_next=""; elif [ -z "$SRC" ]; then SRC="$a"; else echo "Arg desconocido: $a" >&2; exit 1; fi ;;
  esac
done
SRC="${SRC:-$SRC_DEFAULT}"

if [ ! -d "$SRC" ]; then
  echo "No existe la carpeta fuente: $SRC" >&2
  echo "Descomprimí el ZIP primero (ej. en /tmp/opencode) o pasá la ruta correcta." >&2
  exit 1
fi
if [ ! -f "$SRC/items.json" ] && [ ! -f "$SRC/items.csv" ]; then
  echo "No se encontró items.json ni items.csv en: $SRC" >&2
  exit 1
fi

echo "[wa-zip] fuente=$SRC modo=$MODE"
node scripts/import-catalog-wa-zip.mjs --src "$SRC" --mode "$MODE" $DRY

if [ "$BUILD" = "1" ] && [ -z "$DRY" ]; then
  echo "[wa-zip] build..."
  npm run build
fi

echo "[wa-zip] listo."
