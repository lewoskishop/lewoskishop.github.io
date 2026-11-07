#!/usr/bin/env bash
#
# deploy.sh — publica los cambios de este proyecto en la ubicación remota.
#
#   ./deploy.sh                    usa tu clave SSH
#   SSHPASS=tuclave ./deploy.sh    si el remoto pide contraseña
#
# Hace 3 cosas: sincroniza el código, compila en el remoto y verifica que el
# sitio responda 200. No borra nada del remoto (ni node_modules ni dist).
#
set -euo pipefail

REMOTE="${REMOTE:-fsosa@192.168.1.51}"
DEST="${DEST:-/home/fsosa/maskotita}"
URL="${URL:-http://192.168.1.51:4321}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SSH_OPTS=(
  -o PreferredAuthentications=password
  -o PubkeyAuthentication=no
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=10
)

log() { printf '\033[1;32m▶\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✖\033[0m %s\n' "$*" >&2; exit 1; }

ssh_remote() {
  if [ -n "${SSHPASS:-}" ]; then
    command -v sshpass >/dev/null 2>&1 || die "Falta sshpass, o usá una clave SSH (sin SSHPASS)."
    sshpass -e ssh "${SSH_OPTS[@]}" "$REMOTE" "$@"
  else
    warn "SSHPASS no está definido: se intenta con clave SSH. Si falla, usá: SSHPASS=tuclave ./deploy.sh"
    ssh "${SSH_OPTS[@]}" "$REMOTE" "$@"
  fi
}

log "Sincronizando $APP_DIR → $REMOTE:$DEST"
tar cf - -C "$APP_DIR" --ignore-failed-read \
  src scripts public \
  astro.config.mjs package.json package-lock.json tsconfig.json \
  tienda.sh deploy.sh up.sh .nvmrc netlify.toml CMS.md \
  | ssh_remote "mkdir -p '$DEST' && tar xf - -C '$DEST' && echo SYNC_OK"

log "Compilando en el remoto"
ssh_remote "export PATH=/usr/local/bin:\$PATH; cd '$DEST' && npm run build 2>&1 | tail -3"

log "Verificando $URL"
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$URL/" || true)"
[ "$code" = "200" ] || die "El sitio no respondió 200 (código: ${code:-sin respuesta})"
log "Listo ✅ — $URL responde 200"
