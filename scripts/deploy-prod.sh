#!/usr/bin/env bash
# Wdrozenie Horyzontu (CRM) z lista instancji Huba + dane pokazowe.
set -uo pipefail

BASE=/opt/wb/crm
TS=$(date +%Y%m%d-%H%M%S)
KOPIA=/opt/wb/backups/pre-crm-$TS
NOWY=${1:?podaj skrot commita}

log() { echo "[$(date +%H:%M:%S)] $*"; }

log "1/6 kopia bazy, zrodel i obrazu"
sudo install -d -o "$(id -un)" -g "$(id -gn)" "$KOPIA"
docker exec wb-postgres pg_dump -U wbadmin -Fc -d crm > "$KOPIA/crm.dump"
cp -a "$BASE/src" "$KOPIA/src"
docker tag wb-horizon-crm:local "wb-horizon-crm:backup-$TS"
ls -lh "$KOPIA/crm.dump" | awk '{print "      " $5}'

log "2/6 nowe zrodla"
rm -rf /tmp/crm-new && mkdir -p /tmp/crm-new
tar xzf /tmp/crm-src.tar.gz -C /tmp/crm-new
if ! grep -qF -e "HUB_INSTANCE_IDS" /tmp/crm-new/src/lib/hub.ts; then
  echo "!! paczka nie zawiera oczekiwanej zmiany (HUB_INSTANCE_IDS)"; exit 1
fi
rm -rf "$BASE/src.prev" && mv "$BASE/src" "$BASE/src.prev" && mv /tmp/crm-new "$BASE/src"

przywroc() {
  log "!! wycofywanie"
  rm -rf "$BASE/src" && mv "$BASE/src.prev" "$BASE/src"
  docker tag "wb-horizon-crm:backup-$TS" wb-horizon-crm:local
  cd "$BASE" && docker compose up -d || true
  exit 1
}

log "3/6 dopisuje instancje demo do zmiennych"
DEMO=$(docker exec wb-postgres psql -U wbadmin -d hub -At -c \
  "SELECT i.id FROM product_instances i JOIN products p ON p.id=i.\"productId\" JOIN organizations o ON o.id=i.\"orgId\" WHERE o.slug='demo-nowak' AND p.key='crm';")
ORG=$(docker exec wb-postgres psql -U wbadmin -d hub -At -c \
  "SELECT id FROM organizations WHERE slug='demo-nowak';")
if [ -n "$DEMO" ] && [ -f "$BASE/.env" ]; then
  sudo cp "$BASE/.env" "$BASE/.env.przed-demo-$TS"
  for para in "HUB_INSTANCE_ID:$DEMO" "HUB_ORG_ID:$ORG"; do
    K=${para%%:*}; V=${para#*:}
    OB=$(sudo grep -E "^$K=" "$BASE/.env" | head -1 | cut -d= -f2-)
    case ",$OB," in *",$V,"*) continue ;; esac
    sudo sed -i "s|^$K=.*|$K=$OB,$V|" "$BASE/.env"
  done
  sudo grep -E '^HUB_(INSTANCE_ID|ORG_ID)=' "$BASE/.env" | sed 's/^/      /'
else
  echo "      pomijam (brak instancji demo albo pliku .env)"
fi

log "4/6 budowanie"
cd "$BASE" && docker compose build 2>&1 | tail -3 || przywroc

log "5/6 restart"
cd "$BASE" && docker compose up -d
sleep 15

log "6/6 weryfikacja"
KOD=$(curl -s -o /dev/null -w '%{http_code}' --resolve crm.wb-partners.pl:443:127.0.0.1 https://crm.wb-partners.pl/ --max-time 20)
log "    HTTPS -> $KOD"
if [ "$KOD" != "200" ] && [ "$KOD" != "307" ] && [ "$KOD" != "302" ]; then przywroc; fi

echo "$NOWY" | sudo tee "$BASE/COMMIT" > /dev/null
log "GOTOWE. commit $NOWY, kopia w $KOPIA"
