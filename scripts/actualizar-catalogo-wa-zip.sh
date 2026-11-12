#!/usr/bin/env bash
# Actualiza la tienda (LewoskiShop) con el catálogo exportado de WhatsApp
# contenido en el ZIP descomprimido (carpeta con items.json/csv + images/).
#
# Uso:
#   ./scripts/actualizar-catalogo-wa-zip.sh [RUTA_ZIP_EXTRAIDO] [--mode merge|replace] [--dry-run] [--build] [--push ...]
#
# Ejemplos:
#   ./scripts/actualizar-catalogo-wa-zip.sh /tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski
#   ./scripts/actualizar-catalogo-wa-zip.sh /tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski --mode replace --build
#   ./scripts/actualizar-catalogo-wa-zip.sh --mode replace --build --push --git-user lewoskishop --git-token "$GITHUB_TOKEN"
#
# Por defecto: usa /tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski, modo merge.
#   --mode merge|replace   merge: conserva existentes (omite slugs presentes). replace: regenera desde el ZIP.
#   --dry-run              no escribe archivos
#   --build                ejecuta npm run build al finalizar (si no es dry-run)
#   --push                 commitea y pushea los cambios del catálogo y CMS (ignorado en dry-run)
#   --git-user USER        usuario git/HTTPS para el push (o GIT_USER). Si hay token, se usa como usuario HTTPS.
#   --git-token TOKEN      token/PAT para autenticar el push (o GIT_TOKEN/GITHUB_TOKEN). No se imprime.
#   --git-email EMAIL      email para el commit (o GIT_EMAIL)
#   --git-name NAME        nombre para el commit (o GIT_NAME; por defecto --git-user)
#   --commit-message MSG   mensaje de commit (default: "Actualiza catálogo desde export WhatsApp (ZIP)")
#   --remote REMOTE        remote a pushear (default: origin)
#   --branch BRANCH        rama a pushear (default: rama actual)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

SRC_DEFAULT="/tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski"
SRC=""
MODE="merge"
DRY=""
BUILD="0"
PUSH="0"
GIT_USER="${GIT_USER:-}"
GIT_TOKEN="${GIT_TOKEN:-${GITHUB_TOKEN:-}}"
GIT_EMAIL="${GIT_EMAIL:-}"
GIT_NAME="${GIT_NAME:-}"
COMMIT_MSG="Actualiza catálogo desde export WhatsApp (ZIP)"
REMOTE="origin"
BRANCH=""

usage() { sed -n '2,28p' "$0"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="${2:-}"; shift 2 ;;
    --dry-run) DRY="--dry-run"; shift ;;
    --build) BUILD="1"; shift ;;
    --push) PUSH="1"; shift ;;
    --git-user) GIT_USER="${2:-}"; shift 2 ;;
    --git-token) GIT_TOKEN="${2:-}"; shift 2 ;;
    --git-email) GIT_EMAIL="${2:-}"; shift 2 ;;
    --git-name) GIT_NAME="${2:-}"; shift 2 ;;
    --commit-message) COMMIT_MSG="${2:-}"; shift 2 ;;
    --remote) REMOTE="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    merge|replace) if [ -z "$SRC" ] && [ "$MODE" = "merge" ] && [ "${PREV:-}" = "--mode" ]; then :; fi; MODE="$1"; shift ;;
    *) if [ -z "$SRC" ]; then SRC="$1"; else echo "Arg desconocido: $1" >&2; exit 1; fi; shift ;;
  esac
  PREV="${1:-}"
done
SRC="${SRC:-$SRC_DEFAULT}"
[ -n "$GIT_TOKEN" ] && PUSH="1"

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

if [ "$PUSH" = "1" ]; then
  if [ -n "$DRY" ]; then
    echo "[wa-zip] --push ignorado en dry-run." >&2
  else
    if [ -z "$GIT_TOKEN" ]; then
      echo "[wa-zip] --push requiere --git-token (o GIT_TOKEN/GITHUB_TOKEN)." >&2
      exit 1
    fi
    [ -z "$BRANCH" ] && BRANCH="$(git rev-parse --abbrev-ref HEAD)"
    git add src/content/products public/images/products public/admin/config.yml
    if git diff --cached --quiet; then
      echo "[wa-zip] sin cambios para commitear/pushear."
    else
      [ -z "$GIT_NAME" ] && GIT_NAME="${GIT_USER:-LewoskiShop Bot}"
      GIT_ARGS=( -c commit.gpgsign=false )
      [ -n "$GIT_NAME" ] && GIT_ARGS+=( -c "user.name=$GIT_NAME" )
      [ -n "$GIT_EMAIL" ] && GIT_ARGS+=( -c "user.email=$GIT_EMAIL" )
      git "${GIT_ARGS[@]}" commit -m "$COMMIT_MSG"
      ASKPASS="$(mktemp)"
      cat > "$ASKPASS" <<'SH'
#!/bin/sh
case "$1" in *Username*) echo "$GIT_AUTH_USER" ;; *) echo "$GIT_AUTH_TOKEN" ;; esac
SH
      chmod 700 "$ASKPASS"
      AUTH_USER="${GIT_USER:-x-access-token}"
      echo "[wa-zip] push -> $REMOTE/$BRANCH (usuario: $AUTH_USER)"
      if GIT_AUTH_USER="$AUTH_USER" GIT_AUTH_TOKEN="$GIT_TOKEN" GIT_ASKPASS="$ASKPASS" GIT_TERMINAL_PROMPT=0 \
           git push "$REMOTE" "HEAD:$BRANCH"; then
        rm -f "$ASKPASS"
        echo "[wa-zip] push OK."
      else
        rc=$?
        rm -f "$ASKPASS"
        echo "[wa-zip] push falló." >&2
        exit $rc
      fi
    fi
  fi
fi

echo "[wa-zip] listo."
