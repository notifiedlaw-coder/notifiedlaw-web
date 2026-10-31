# ClamAV for My Files uploads, run as a Cloudflare Container (see custom-worker.ts and src/lib/scan.ts).
# The official image runs clamd (TCP 3310) and freshclam, which keeps the signatures current while it runs.
# Pinned by digest so a re-pushed tag cannot change what scans uploads. Update deliberately: docker buildx imagetools inspect clamav/clamav:1.4
FROM clamav/clamav:1.4@sha256:982e28f90061d0e66eb03276419f589a47c9fa601e985e472fc2f6c64b497ca0

RUN apk add --no-cache python3 \
 # Bake signatures into the image so a cold start does not wait on a download. A failed download fails the build,
 # so an image never ships without signatures.
 && freshclam --stdout \
 # Uploads are capped at 25 MB; leave clamd headroom so a full-size file is scanned, not refused.
 && sed -i '/^StreamMaxLength/d' /etc/clamav/clamd.conf \
 && echo 'StreamMaxLength 30M' >> /etc/clamav/clamd.conf

COPY server.py start.sh /scanner/
RUN chmod +x /scanner/start.sh
EXPOSE 8080
ENTRYPOINT ["/scanner/start.sh"]
