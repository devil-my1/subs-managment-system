#!/bin/sh
set -eu

while true; do
  curl -sS -X POST http://backend:5050/api/v1/jobs/send-reminders \
    -H "X-Internal-Token: ${INTERNAL_JOB_TOKEN:-}" >/dev/null || true

  curl -sS -X POST http://backend:5050/api/v1/jobs/advance-renewals \
    -H "X-Internal-Token: ${INTERNAL_JOB_TOKEN:-}" >/dev/null || true

  # Run every 120 minutes; adjust as needed
  sleep 7200
done
