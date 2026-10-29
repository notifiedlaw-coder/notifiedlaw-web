# ClamAV for My Files uploads, run as a Cloudflare Container (see custom-worker.ts and src/lib/scan.ts).
# The official image runs clamd (TCP 3310) and freshclam, which keeps the signatures current while it runs.
FROM clamav/clamav:1.4

RUN apk add --no-cache python3 \
 # Bake signatures into the image so a cold start does not wait on a download.
 && (freshclam --stdout || true) \
 # Uploads are capped at 25 MB; leave clamd headroom so a full-size file is scanned, not refused.
 && sed -i '/^StreamMaxLength/d' /etc/clamav/clamd.conf \
 && echo 'StreamMaxLength 30M' >> /etc/clamav/clamd.conf

COPY server.py start.sh /scanner/
RUN chmod +x /scanner/start.sh
EXPOSE 8080
ENTRYPOINT ["/scanner/start.sh"]
