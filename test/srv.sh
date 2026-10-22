#!/bin/sh
# Sinov serverini TOZA baza bilan ishga tushiradi:  sh test/srv.sh [port]
# DIQQAT: TEST_DB dagi vb_ jadvallarini o'chirib tashlaydi — faqat sinov bazasida ishlating.
PORT=${1:-4311}
DB=${TEST_DB:-postgres://vb@127.0.0.1:54329/vaqtbanki}
TMP=${TMPDIR:-/tmp}
PIDF=$TMP/vb-server.pid
[ -f "$PIDF" ] && kill "$(cat "$PIDF")" 2>/dev/null
sleep 0.4
psql "$DB" -qc "DROP TABLE IF EXISTS vb_items, vb_sessions, vb_users CASCADE" >/dev/null 2>&1
cd "$(dirname "$0")/.." || exit 1
PORT=$PORT DATABASE_URL="$DB" nohup node server.js > "$TMP/vb-server.log" 2>&1 &
echo $! > "$PIDF"
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null && break; sleep 0.25; done
curl -s "http://127.0.0.1:$PORT/api/health"; echo
