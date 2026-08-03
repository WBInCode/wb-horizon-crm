#!/usr/bin/env bash
# Wdrozenie CRM Horizon na produkcje z automatycznym wycofaniem.
# Uzycie: bash wdroz-crm.sh <skrot-commita>
set -euo pipefail

NOWY_COMMIT=${1:?podaj skrot commita}
BAZA=/opt/wb/crm
TS=$(date +%Y%m%d-%H%M%S)
KOPIA=/opt/wb/backups/pre-crm-$TS

# Kontener nie ma wget ani curl, wiec odpytujemy z hosta przez traefika -
# to i tak sprawdza droge, ktora chodza uzytkownicy.
zdrowie() {
  curl -s --resolve crm.wb-partners.pl:443:127.0.0.1 \
    https://crm.wb-partners.pl/api/health --max-time 10
}

log() { echo "[$(date +%H:%M:%S)] $*"; }

log "0/7 stan przed zmiana"
POPRZEDNI=$(cat "$BAZA/COMMIT" 2>/dev/null || echo nieznany)
log "    commit: $POPRZEDNI"
if ! zdrowie | grep -q '"status":"ok"'; then
  echo "!! /api/health nie odpowiada JUZ TERAZ - przerywam, zeby nie zrzucic winy na to wdrozenie"
  exit 1
fi
log "    /api/health -> $(zdrowie)"

log "1/7 kopia bazy, zrodel i obrazu"
sudo install -d -o "$(id -un)" -g "$(id -gn)" "$KOPIA"
docker exec wb-postgres pg_dump -U wbadmin -Fc -d crm > "$KOPIA/crm.dump"
sudo cp -a "$BAZA/src" "$KOPIA/src"
sudo cp -a "$BAZA/.env.crm" "$KOPIA/.env.crm"
docker tag wb-horizon-crm:local "wb-horizon-crm:backup-$TS" 2>/dev/null || true
ls -lh "$KOPIA/crm.dump"

log "2/7 rozpakowanie nowych zrodel"
rm -rf /tmp/crm-nowe && mkdir -p /tmp/crm-nowe
tar xzf /tmp/crm-src.tar.gz -C /tmp/crm-nowe
# Sprawdzian, ze to faktycznie wersja z poprawkami — inaczej nie ma po co budowac.
grep -q 'isClientVisibleToStructureUser' /tmp/crm-nowe/src/lib/structure.ts
grep -q 'CRM_ALLOW_LOCAL_STAFF_LOGIN' /tmp/crm-nowe/src/app/api/auth/\[...nextauth\]/route.ts
sudo rm -rf "$BAZA/src.prev" && sudo mv "$BAZA/src" "$BAZA/src.prev"
sudo mv /tmp/crm-nowe "$BAZA/src"

wycofaj() {
  log "!! wycofywanie"
  sudo rm -rf "$BAZA/src"
  sudo cp -a "$KOPIA/src" "$BAZA/src"
  sudo cp -a "$KOPIA/.env.crm" "$BAZA/.env.crm"
  docker tag "wb-horizon-crm:backup-$TS" wb-horizon-crm:local 2>/dev/null || true
  cd "$BAZA" && docker compose up -d || true
  log "!! przywrocono poprzednia wersje (kopia: $KOPIA)"
  exit 1
}

log "3/7 uzupelnienie konfiguracji"
if ! grep -q '^HUB_PUBLIC_URL=' "$BAZA/.env.crm"; then
  echo 'HUB_PUBLIC_URL=https://wb-partners.pl' | sudo tee -a "$BAZA/.env.crm" > /dev/null
  log "    dopisano HUB_PUBLIC_URL"
fi
if ! grep -q '^CRM_ALLOW_LOCAL_STAFF_LOGIN=' "$BAZA/.env.crm"; then
  echo 'CRM_ALLOW_LOCAL_STAFF_LOGIN=false' | sudo tee -a "$BAZA/.env.crm" > /dev/null
  log "    dopisano CRM_ALLOW_LOCAL_STAFF_LOGIN=false"
fi

log "4/7 budowanie"
cd "$BAZA"
docker compose build || { log "!! budowanie nieudane"; wycofaj; }

log "5/7 restart"
docker compose up -d

log "6/7 czekam na gotowosc"
ok=0
for _ in $(seq 1 48); do
  if zdrowie | grep -q '"status":"ok"'; then ok=1; break; fi
  # kontener w petli restartow - nie ma na co czekac
  if [ "$(docker inspect wb-crm --format '{{.State.Restarting}}' 2>/dev/null)" = "true" ]; then
    log "!! kontener restartuje sie w petli"
    docker logs --tail 40 wb-crm || true
    wycofaj
  fi
  sleep 5
done
if [ "$ok" != 1 ]; then
  log "!! usluga nie wstala"
  docker logs --tail 40 wb-crm || true
  wycofaj
fi

log "7/7 weryfikacja"
log "    /api/health   -> $(zdrowie)"
log "    HTTPS /login  -> $(curl -s -o /dev/null -w '%{http_code}' --resolve crm.wb-partners.pl:443:127.0.0.1 https://crm.wb-partners.pl/login --max-time 15)"
log "    bramka tokenowa (ma byc 404) -> $(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{\"token\":\"x\"}' --resolve crm.wb-partners.pl:443:127.0.0.1 https://crm.wb-partners.pl/api/auth/verify-admin-token --max-time 15)"

echo "$NOWY_COMMIT" | sudo tee "$BAZA/COMMIT" > /dev/null
log "GOTOWE. commit $NOWY_COMMIT (poprzedni $POPRZEDNI), kopia w $KOPIA"
