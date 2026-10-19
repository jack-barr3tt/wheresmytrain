#!/bin/sh
# Compose only replaces containers in this project. A previous copy of the
# bot (another project name, a container left from a failed start, or a
# node process from before Docker) keeps the published host port, and
# `up` fails with "address already in use".
set -eu

DEPLOY_PATH="${DEPLOY_PATH:?DEPLOY_PATH is required}"
DEPLOY_PATH=${DEPLOY_PATH%/}
IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG is required}"
REGISTRY="${REGISTRY:-ghcr.io/jack-barr3tt}"

export REGISTRY IMAGE_TAG

cd "$DEPLOY_PATH"

compose() {
  docker compose -f deploy/docker-compose.yml "$@"
}

published_port() {
  compose config | awk '
    function emit(line,   n, parts, host) {
      gsub(/["]/, "", line)
      sub(/\/(tcp|udp)$/, "", line)
      n = split(line, parts, ":")
      if (n >= 3) {
        host = parts[n - 1]
      } else if (n == 2) {
        host = parts[1]
        sub(/^.*[^0-9]/, "", host)
      } else {
        return
      }
      if (host ~ /^[0-9]+$/) {
        print host
        exit
      }
    }
    $1 == "published:" {
      v = $2
      gsub(/"/, "", v)
      if (v ~ /^[0-9]+$/) {
        print v
        exit
      }
    }
    /^[[:space:]]*-/ {
      emit($0)
    }
  '
}

port_hex() {
  printf '%04X' "$1"
}

port_is_listening() {
  hex=$(port_hex "$1")
  if [ -r /proc/net/tcp6 ]; then
    awk -v p="$hex" '
      BEGIN { found = 0 }
      $1 == "sl" { next }
      {
        n = split($2, a, ":")
        if (n >= 2 && a[n] == p && $4 == "0A") found = 1
      }
      END { exit (found ? 0 : 1) }
    ' /proc/net/tcp /proc/net/tcp6
  else
    awk -v p="$hex" '
      BEGIN { found = 0 }
      $1 == "sl" { next }
      {
        n = split($2, a, ":")
        if (n >= 2 && a[n] == p && $4 == "0A") found = 1
      }
      END { exit (found ? 0 : 1) }
    ' /proc/net/tcp
  fi
}

listening_inodes() {
  hex=$(port_hex "$1")
  if [ -r /proc/net/tcp6 ]; then
    awk -v p="$hex" '
      $1 == "sl" { next }
      {
        n = split($2, a, ":")
        if (n >= 2 && a[n] == p && $4 == "0A") print $10
      }
    ' /proc/net/tcp /proc/net/tcp6
  else
    awk -v p="$hex" '
      $1 == "sl" { next }
      {
        n = split($2, a, ":")
        if (n >= 2 && a[n] == p && $4 == "0A") print $10
      }
    ' /proc/net/tcp
  fi
}

pids_for_port() {
  inodes=$(listening_inodes "$1" | tr '\n' ' ')
  [ -n "$inodes" ] || return 0
  for proc in /proc/[0-9]*; do
    [ -d "$proc/fd" ] || continue
    pid=${proc##*/}
    for fd in "$proc"/fd/*; do
      [ -L "$fd" ] || continue
      target=$(readlink "$fd" 2>/dev/null || true)
      case "$target" in
        socket:\[*\])
          inode=${target#socket:[}
          inode=${inode%]}
          case " $inodes " in
            *" $inode "*)
              printf '%s\n' "$pid"
              break
              ;;
          esac
          ;;
      esac
    done
  done | awk 'NF && !seen[$0]++'
}

container_ports() {
  docker inspect -f '{{range $p, $conf := .HostConfig.PortBindings}}{{range $conf}}{{.HostPort}} {{end}}{{end}}' "$1" 2>/dev/null || true
}

is_ours() {
  id=$1
  image=$(docker inspect -f '{{.Config.Image}}' "$id" 2>/dev/null || true)
  name=$(docker inspect -f '{{.Name}}' "$id" 2>/dev/null || true)
  workdir=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$id" 2>/dev/null || true)
  config_files=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$id" 2>/dev/null || true)
  if [ "$workdir" = "<no value>" ]; then
    workdir=
  fi
  if [ "$config_files" = "<no value>" ]; then
    config_files=
  fi
  case "$image$name" in
    *wheresmytrain*|*discord-rtt*) return 0 ;;
  esac
  case "$workdir" in
    "$DEPLOY_PATH"|"$DEPLOY_PATH"/*) return 0 ;;
  esac
  case "$config_files" in
    *"$DEPLOY_PATH"/*) return 0 ;;
  esac
  return 1
}

remove_our_containers() {
  for id in $(docker ps -q); do
    if ! is_ours "$id"; then
      continue
    fi
    ports=$(container_ports "$id")
    netmode=$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$id" 2>/dev/null || true)
    remove=0
    case " $ports " in
      *" $HOST_PORT "*) remove=1 ;;
    esac
    if [ "$netmode" = "host" ]; then
      remove=1
    fi
    if [ "$remove" -eq 1 ]; then
      image=$(docker inspect -f '{{.Config.Image}}' "$id" 2>/dev/null || true)
      name=$(docker inspect -f '{{.Name}}' "$id" 2>/dev/null || true)
      echo "==> Removing ${name#/} (${image}) from host port ${HOST_PORT}"
      docker rm -f "$id" >/dev/null
    fi
  done
}

foreign_publisher() {
  for id in $(docker ps -q); do
    ports=$(container_ports "$id")
    case " $ports " in
      *" $HOST_PORT "*)
        printf '%s\n' "$id"
        return 0
        ;;
    esac
  done
  return 0
}

should_stop_listener() {
  pid=$1
  cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
  cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
  case "$cmd" in
    *docker-proxy*)
      case "$cmd" in
        *" -host-port ${HOST_PORT} "*|*" -host-port ${HOST_PORT}") return 0 ;;
      esac
      ;;
  esac
  case "$cwd" in
    "$DEPLOY_PATH"|"$DEPLOY_PATH"/*) return 0 ;;
  esac
  case "$cmd" in
    *wheresmytrain*|*discord-rtt*|*"$DEPLOY_PATH"*) return 0 ;;
  esac
  return 1
}

stop_listener() {
  pid=$1
  signal=$2
  cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
  unit=$(tr '/' '\n' < "/proc/$pid/cgroup" 2>/dev/null | awk '/\.service$/ { print; exit }')
  case "$unit" in
    docker.service|containerd.service|user@*.service|systemd-*.service|ssh.service|sshd.service|nginx.service|caddy.service|dbus.service)
      unit=
      ;;
  esac
  if [ "$signal" != "9" ] && [ -n "$unit" ] && command -v systemctl >/dev/null 2>&1; then
    echo "==> Stopping ${unit} (pid ${pid}) on port ${HOST_PORT}"
    systemctl stop --timeout=20 "$unit" 2>/dev/null || true
  fi
  if [ -d "/proc/$pid" ]; then
    echo "==> Stopping process ${pid} on port ${HOST_PORT}: ${cmd}"
    kill "-${signal}" "$pid" 2>/dev/null || true
  fi
}

stop_our_listeners() {
  signal=$1
  pids=$(pids_for_port "$HOST_PORT" || true)
  for pid in $pids; do
    if should_stop_listener "$pid"; then
      stop_listener "$pid" "$signal"
      STOPPED_LISTENER=1
    fi
  done
}

describe_listeners() {
  pids=$(pids_for_port "$HOST_PORT" || true)
  if [ -z "$pids" ]; then
    echo "Host port ${HOST_PORT} is in use, but the listener could not be identified." >&2
    return 0
  fi
  for pid in $pids; do
    cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
    cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
    echo "pid ${pid} cwd=${cwd} cmd=${cmd}" >&2
  done
}

release_port() {
  remove_our_containers
  foreign=$(foreign_publisher || true)
  if [ -n "$foreign" ]; then
    echo "Host port ${HOST_PORT} is published by another container:" >&2
    docker ps --filter "id=${foreign}" >&2 || true
    exit 1
  fi

  STOPPED_LISTENER=0
  stop_our_listeners 15
  if port_is_listening "$HOST_PORT" && [ "$STOPPED_LISTENER" -eq 0 ]; then
    echo "Host port ${HOST_PORT} is already in use." >&2
    describe_listeners
    exit 1
  fi
  i=0
  while port_is_listening "$HOST_PORT"; do
    i=$((i + 1))
    if [ "$i" -gt 5 ]; then
      break
    fi
    sleep 1
  done
  if port_is_listening "$HOST_PORT"; then
    stop_our_listeners 9
    sleep 1
  fi
  if port_is_listening "$HOST_PORT"; then
    echo "Host port ${HOST_PORT} is already in use." >&2
    describe_listeners
    exit 1
  fi
}

HOST_PORT=$(published_port)
case "$HOST_PORT" in
  ''|*[!0-9]*)
    echo "Could not determine the published host port from compose config" >&2
    exit 1
    ;;
esac

compose pull
compose down --remove-orphans --timeout 30
release_port
if ! compose up -d --remove-orphans; then
  release_port
  compose up -d --remove-orphans
fi

echo "==> Deployed ${REGISTRY}/wheresmytrain:${IMAGE_TAG}"
