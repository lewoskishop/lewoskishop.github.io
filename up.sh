#!/usr/bin/env bash
#
# up.sh — sube la tienda Maskotita a GitHub y prepara GitHub Pages
#
# Uso:
#   ./up.sh            sube los cambios a la rama main (pide el token si hace falta)
#   ./up.sh build      solo compila el sitio en dist/
#   ./up.sh token      solo verifica un Personal Access Token
#
# El token se pide de forma oculta (no se ve en pantalla ni queda en el
# historial) y se guarda en la caché de credenciales de git (en memoria,
# no en disco). GitHub ya no acepta contraseña: en el campo "password"
# va el Personal Access Token.
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_SLUG="maskotita/maskotita.github.io"
REPO_URL="https://github.com/${REPO_SLUG}.git"
GIT_USER="maskotita"
# GitHub autentica sólo por el token cuando el usuario es "x-access-token".
# Así el push no depende de con qué cuenta se creó el token.
AUTH_USER="x-access-token"
CACHE_TIMEOUT="28800"   # 8 horas

log()  { printf '\033[1;32m▶\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m✖\033[0m %s\n' "$*" >&2; }
dim()  { printf '\033[2m%s\033[0m\n' "$*"; }

cd "$APP_DIR"

# -----------------------------------------------------------------------------
# Credenciales
# -----------------------------------------------------------------------------

# Pide el token sin eco.
read_token() {
  local token=""
  printf '\n\033[1mPegá tu Personal Access Token de GitHub\033[0m\n' >&2
  dim "  (no se muestra. Se usa como contraseña en GitHub, no como usuario.)" >&2
  printf '  Token: ' >&2
  IFS= read -r -s token </dev/tty || true
  printf '\n' >&2
  printf '%s' "$token"
}

# Guarda el token en la caché de credenciales de git (memoria, no disco).
save_credentials() {
  local token="$1"
  local user="${2:-$AUTH_USER}"
  git config --local credential.helper "cache --timeout=${CACHE_TIMEOUT}"
  git config --local credential.username "$user"
  printf 'protocol=https\nhost=github.com\nusername=%s\npassword=%s\n\n' \
    "$user" "$token" | git credential approve
}

# ¿Hay credenciales guardadas que GitHub acepte? (verifica contra la API)
credentials_work() {
  local token
  token="$(printf 'protocol=https\nhost=github.com\n\n' | GIT_TERMINAL_PROMPT=0 git credential fill 2>/dev/null \
    | sed -n 's/^password=//p' || true)"
  [ -n "$token" ] || return 1
  # Comprobación cheap contra la API: 200 = el token sirve.
  REPO_SLUG="$REPO_SLUG" node -e '
    const t = process.argv[1];
    fetch(`https://api.github.com/repos/${process.env.REPO_SLUG}`, {
      headers: { Authorization: `Bearer ${t}`, Accept: "application/vnd.github+json" },
    })
      .then((r) => process.exit(r.status === 200 ? 0 : 1))
      .catch(() => process.exit(1));
  ' "$token"
}

# Verifica el token contra la API de GitHub (sólo GET, no modifica nada).
verify_token() {
  local token="$1"
  if command -v npm >/dev/null 2>&1 && [ -f scripts/check-token.mjs ]; then
    printf '%s' "$token" | npm run --silent token || return 1
  else
    warn "No se pudo correr el verificador (npm). Continúo igual."
  fi
}

# Devuelve 0 si ya hay credenciales utilizables.
ensure_credentials() {
  if credentials_work; then
    log "Ya hay credenciales guardadas para github.com"
    return 0
  fi

  local token="${GITHUB_TOKEN:-}"
  if [ -z "$token" ]; then
    token="$(read_token)"
  fi

  if [ -z "$token" ]; then
    err "No se recibió ningún token. Abortando."
    dim "  Creá uno en: https://github.com/settings/personal-access-tokens/new"
    dim "  (permiso Contents: Read and write sobre ${REPO_SLUG})"
    return 1
  fi

  log "Verificando el token…"
  if ! verify_token "$token"; then
    err "El token no sirve para editar el repo. Corregí los permisos y volvé a correr ./up.sh"
    return 1
  fi

  save_credentials "$token"
  log "Token guardado en la caché de git (dura 8 h). No queda en disco."
}

# -----------------------------------------------------------------------------

case "${1:-up}" in
  build)
    log "Compilando sitio estático (npm run build)"
    npm run build
    log "Listo: dist/ generado"
    ;;

  token)
    TOKEN="${GITHUB_TOKEN:-$(read_token)}"
    verify_token "$TOKEN"
    ;;

  up|"")
    if [ ! -d .git ]; then
      log "Inicializando git (si no existe)"
      git init
    fi

    # La rama tiene que llamarse "main": es la que publica el workflow
    # (.github/workflows/deploy.yml) y la rama por defecto del repo.
    git branch -M main

    if ! git remote get-url origin >/dev/null 2>&1; then
      git remote add origin "$REPO_URL"
    fi

    log "Preparando los cambios"
    git add -A
    if git diff --cached --quiet; then
      dim "  (no hay cambios nuevos)"
    else
      git commit -m "${UP_MESSAGE:-Actualiza la tienda Maskotita}"
    fi

    ensure_credentials

    log "Subiendo a GitHub"
    if git push -u origin main; then
      log "Listo. Ahora en GitHub:"
      dim "  1. Settings → Pages → Source: GitHub Actions"
      dim "  2. Esperá a que el workflow termine (pestaña Actions)"
      dim "  3. Tu sitio: https://maskotita.github.io/"
    else
      warn "Falló el push con el usuario '${AUTH_USER}'. Reintento con '${GIT_USER}'…"
      TOKEN_SAVED="$(printf 'protocol=https\nhost=github.com\n\n' | GIT_TERMINAL_PROMPT=0 git credential fill 2>/dev/null | sed -n 's/^password=//p' || true)"
      if [ -n "$TOKEN_SAVED" ]; then
        save_credentials "$TOKEN_SAVED" "$GIT_USER"
        if git push -u origin main; then
          log "Listo. Tu sitio: https://maskotita.github.io/"
          exit 0
        fi
      fi
      err "No se pudo subir. Causas habituales:"
      dim "  · el token es de otra cuenta sin permiso de escritura sobre ${REPO_SLUG}"
      dim "  · el token venció: https://github.com/settings/personal-access-tokens"
      dim "  · el repo tiene commits que no tenés: git pull --rebase origin main"
      dim ""
      dim "  Alternativa (pega el token en el lugar de <TOKEN>):"
      dim "    git push https://${AUTH_USER}:<TOKEN>@github.com/${REPO_SLUG}.git main"
      exit 1
    fi
    ;;

  *)
    echo "Uso: $0 [up|build|token]"
    exit 1
    ;;
esac
