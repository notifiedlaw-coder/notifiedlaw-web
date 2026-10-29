#!/usr/bin/env bash
# Creates or updates the notifiedlaw.com WAF rate limiting rule. It blocks one IP sending a flood of requests at
# Cloudflare's edge, before the Worker runs, so blocked requests cost nothing. The Worker's own limits
# (RL_PAGES in wrangler.jsonc, per session or IP) handle normal over-use; this rule is set well above them so a
# shared campus or mobile network IP of signed-in students is not blocked.
#
# Needs an API token with Zone > Zone WAF > Edit and Zone > Zone > Read for notifiedlaw.com (Wrangler's login does
# not include WAF):  CLOUDFLARE_API_TOKEN=... bash scripts/waf-rate-limit.sh
#
# Free plan limits: one rule, counted per IP, 10 second period, 10 second block. Static assets under
# /_next/static/ are left out, since one page load fetches dozens of them.
set -euo pipefail

ZONE_NAME=notifiedlaw.com
REF=notifiedlaw-ip-flood
REQUESTS_PER_10S=300
API=https://api.cloudflare.com/client/v4
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN to a token with Zone WAF Edit on $ZONE_NAME}"

cf() { curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" "$@"; }
ok() { python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("success") else (print(json.dumps(d.get("errors")), file=sys.stderr) or 1))'; }

zone=$(cf "$API/zones?name=$ZONE_NAME" | python3 -c 'import json,sys; r=json.load(sys.stdin)["result"]; print(r[0]["id"] if r else "")')
[ -n "$zone" ] || { echo "Zone $ZONE_NAME not found for this token." >&2; exit 1; }

rule=$(cat <<JSON
{
  "ref": "$REF",
  "description": "Block one IP flooding notifiedlaw.com (excludes static assets)",
  "expression": "(not starts_with(http.request.uri.path, \"/_next/static/\"))",
  "action": "block",
  "ratelimit": {
    "characteristics": ["ip.src", "cf.colo.id"],
    "period": 10,
    "requests_per_period": $REQUESTS_PER_10S,
    "mitigation_timeout": 10
  },
  "enabled": true
}
JSON
)

entry=$(cf "$API/zones/$zone/rulesets/phases/http_ratelimit/entrypoint")
if ! echo "$entry" | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("success") else 1)'; then
  # No rate limiting rules on the zone yet: create the phase entrypoint with just this rule.
  cf -X PUT "$API/zones/$zone/rulesets/phases/http_ratelimit/entrypoint" -d "{\"rules\": [$rule]}" | ok
  echo "Created rate limiting rule $REF ($REQUESTS_PER_10S requests per 10 s per IP)."
  exit 0
fi

ruleset=$(echo "$entry" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["id"])')
existing=$(echo "$entry" | python3 -c "import json,sys; print(next((r['id'] for r in json.load(sys.stdin)['result'].get('rules', []) if r.get('ref') == '$REF'), ''))")
if [ -n "$existing" ]; then
  cf -X PATCH "$API/zones/$zone/rulesets/$ruleset/rules/$existing" -d "$rule" | ok
  echo "Updated rate limiting rule $REF."
else
  # Adds to the rules already there, leaving them alone.
  cf -X POST "$API/zones/$zone/rulesets/$ruleset/rules" -d "$rule" | ok
  echo "Added rate limiting rule $REF."
fi
