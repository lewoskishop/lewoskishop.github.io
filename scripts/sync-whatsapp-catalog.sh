#!/usr/bin/env bash
# Sincroniza el catálogo de WhatsApp al formato de este repo y (opcionalmente) rebuild/push.
# Pensado para correr 1 vez al día (cron).
#
# IMPORTANTE: wa.me/c/<número> no es raspable por HTTP. Este wrapper usa el importador Node
# con una fuente real (--source api o --source json:...). Si no hay fuente configurada, sale
# con instrucciones (no rompe nada).
#
# Uso:
#   ./scripts/sync-whatsapp-catalog.sh                      # intenta (mostrará instrucciones si no hay fuente)
#   SOURCE=json:catalogo.json ./scripts/sync-whatsapp-catalog.sh
#   WA_GRAPH_TOKEN=... WA_CATALOG_ID=... SOURCE=api ./scripts/sync-whatsapp-catalog.sh
#   SOURCE=api MODE=merge BUILD=1 PUSH=0 ./scripts/sync-whatsapp-catalog.sh
#
# Cron diario (ej. 3:15 AM):
#   15 3 * * * cd /ruta/a/lewoskishop.github.io && SOURCE=api WA_GRAPH_TOKEN=xxx WA_CATALOG_ID=yyy BUILD=1 ./scripts/sync-whatsapp-catalog.sh >> /tmp/sync-wa.log 2>&1
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

SOURCE="${SOURCE:-wa}"          # wa | api | json:/ruta.json
MODE="${MODE:-merge}"            # merge | replace
BUILD="${BUILD:-0}"              # 1 = npm run build tras sincronizar
PUSH="${PUSH:-0}"                # 1 = git commit+push si hubo cambios (requiere credenciales configuradas)
LOG_PREFIX="[sync-wa $(date -Iseconds)]"

echo "$LOG_PREFIX inicio source=$SOURCE mode=$MODE"

# captura estado antes
node scripts/sync-whatsapp-catalog.mjs --source "$SOURCE" --mode "$MODE"
rc=$?
if [ $rc -ne 0 ]; then
  echo "$LOG_PREFIX sync terminó con código $rc (ver mensajes arriba)"
  exit $rc
fi

if [ "$BUILD" = "1" ]; then
  echo "$LOG_PREFIX build..."
  npm run build
fi

if [ "$PUSH" = "1" ]; then
  if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git add -A
    git commit -m "Sync catálogo WhatsApp $(date -I)"
    git push origin main
    echo "$LOG_PREFIX cambios pusheados"
  else
    echo "$LOG_PREFIX sin cambios para pushear"
  fi
fi

echo "$LOG_PREFIX fin"
