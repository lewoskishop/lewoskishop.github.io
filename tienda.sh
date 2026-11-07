#!/usr/bin/env bash
#
# tienda.sh — levanta la tienda Maskotita (patitas-store, Astro estático)
#
# Uso:
#   ./tienda.sh              compila y sirve en primer plano (Ctrl+C para cortar)
#   ./tienda.sh start        levanta en segundo plano (systemd si hay root, si no nohup)
#   ./tienda.sh stop         detiene el servicio de segundo plano
#   ./tienda.sh restart      reinicia el servicio de segundo plano
#   ./tienda.sh status       muestra el estado del servicio
#   ./tienda.sh logs         sigue los logs (Ctrl+C para salir)
#   ./tienda.sh dev          servidor de desarrollo con recarga en caliente
#   ./tienda.sh build        solo compila a dist/
#   ./tienda.sh help         esta ayuda
#
# Variables opcionales:
#   PORT=4321   HOST=0.0.0.0
#
set -euo pipefail

SERVICE="otra-tienda"
PORT="${PORT:-4321}"
HOST="${HOST:-0.0.0.0}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="/tmp/tienda.pid"
LOG_FILE="/tmp/tienda.log"

# Node quedó instalado system-wide en /usr/local/bin en este equipo.
export PATH="/usr/local/bin:$PATH"

log()  { printf '\033[1;32m▶\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✖\033[0m %s\n' "$*" >&2; exit 1; }

need_node() {
  command -v node >/dev/null 2>&1 || die "Node no está instalado. Hace falta Node 22+ (node/npm en el PATH)."
}

ensure_deps() {
  if [ ! -d "$APP_DIR/node_modules" ]; then
    log "Instalando dependencias (npm ci)"
    ( cd "$APP_DIR" && npm ci )
  fi
}

do_build() {
  ensure_deps
  log "Compilando (npm run build)"
  ( cd "$APP_DIR" && npm run build )
}

is_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

run_foreground() {
  log "Sirviendo en http://$HOST:$PORT  (Ctrl+C para cortar)"
  cd "$APP_DIR"
  exec npm run preview -- --host "$HOST" --port "$PORT"
}

has_systemd_unit() {
  command -v systemctl >/dev/null 2>&1 || return 1
  [ -f "/etc/systemd/system/${SERVICE}.service" ] ||
    [ -f "/lib/systemd/system/${SERVICE}.service" ] ||
    [ -f "/usr/lib/systemd/system/${SERVICE}.service" ]
}

# ¿El puerto está escuchando? (herestring para no romper con `set -o pipefail`)
port_open() {
  command -v ss >/dev/null 2>&1 || return 1
  local out
  out="$(ss -ltn 2>/dev/null)" || true
  grep -q ":$PORT " <<<"$out"
}

# --- subcomandos ---------------------------------------------------------

cmd_up() {
  need_node
  do_build
  run_foreground
}

cmd_dev() {
  need_node
  ensure_deps
  log "Servidor de desarrollo en http://$HOST:$PORT"
  cd "$APP_DIR"
  exec npm run dev -- --host "$HOST" --port "$PORT"
}

cmd_build() {
  need_node
  do_build
}

cmd_start() {
  need_node

  if has_systemd_unit; then
    if systemctl start "$SERVICE" 2>/dev/null; then
      log "Levantado vía systemd (${SERVICE}.service)"
      sleep 2
      systemctl --no-pager --lines=0 status "$SERVICE" | head -4
      return
    fi
    warn "systemd requiere root (probá: su -c '$0 start'). Uso nohup como alternativa."
  fi

  if is_running; then
    warn "Ya está corriendo (PID $(cat "$PID_FILE")). Usá: $0 restart"
    return
  fi
  if port_open; then
    die "El puerto $PORT ya está ocupado. Revisá con: $0 status"
  fi

  do_build
  log "Levantando en segundo plano (nohup), log en $LOG_FILE"
  cd "$APP_DIR"
  nohup npm run preview -- --host "$HOST" --port "$PORT" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 2
  if is_running; then
    log "Activo en http://$HOST:$PORT  (PID $(cat "$PID_FILE"))"
  else
    die "No arrancó. Revisá $LOG_FILE"
  fi
}

cmd_stop() {
  if has_systemd_unit; then
    if systemctl stop "$SERVICE" 2>/dev/null; then
      log "Detenido vía systemd"
      return
    fi
    warn "systemd requiere root; reviso proceso nohup..."
  fi
  if is_running; then
    local pid; pid="$(cat "$PID_FILE")"
    log "Deteniendo PID $pid"
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
  else
    warn "No hay servicio en segundo plano corriendo."
  fi
}

cmd_status() {
  if has_systemd_unit; then
    systemctl --no-pager -n 5 status "$SERVICE" || true
  fi
  if is_running; then
    log "nohup activo (PID $(cat "$PID_FILE")) — log: $LOG_FILE"
  elif ! has_systemd_unit; then
    warn "Sin servicio activo."
  fi
  if port_open; then
    log "Puerto $PORT escuchando"
  else
    warn "Puerto $PORT cerrado"
  fi
}

cmd_logs() {
  if has_systemd_unit; then
    if journalctl -u "$SERVICE" -f 2>/dev/null; then return; fi
    warn "No se pudo leer el journal (probá como root); reviso $LOG_FILE"
  fi
  if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
  else
    die "No hay logs disponibles."
  fi
}

cmd_help() {
  sed -n '3,17p' "$0" | sed 's/^# \{0,1\}//'
}

case "${1:-up}" in
  up|"")      cmd_up ;;
  start)      cmd_start ;;
  stop)       cmd_stop ;;
  restart)    cmd_stop; cmd_start ;;
  status)     cmd_status ;;
  logs)       cmd_logs ;;
  dev)        cmd_dev ;;
  build)      cmd_build ;;
  help|-h|--help) cmd_help ;;
  *)          die "Comando desconocido: $1 (probá: $0 help)" ;;
esac
