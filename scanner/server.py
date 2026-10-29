"""HTTP front end for clamd. POST /scan with the file as the body; the reply is JSON:
{"result": "clean"} | {"result": "infected", "signature": "..."} | {"result": "error", "detail": "..."}.
Only the Worker reaches this server: a Cloudflare Container has no public address."""

import json
import socket
import struct
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CLAMD = ("127.0.0.1", 3310)
MAX_BODY = 30 * 1024 * 1024
CHUNK = 1024 * 1024
# clamd loads its signatures for up to a minute after a cold start; scans wait for it rather than fail.
READY_WAIT = 180


def connect():
    deadline = time.time() + READY_WAIT
    while True:
        try:
            s = socket.create_connection(CLAMD, timeout=10)
            s.settimeout(120)
            return s
        except OSError:
            if time.time() > deadline:
                raise
            time.sleep(1)


def scan(data: bytes):
    with connect() as s:
        s.sendall(b"zINSTREAM\0")
        for i in range(0, len(data), CHUNK):
            part = data[i : i + CHUNK]
            s.sendall(struct.pack("!L", len(part)) + part)
        s.sendall(struct.pack("!L", 0))
        reply = b""
        while not reply.endswith(b"\0"):
            got = s.recv(4096)
            if not got:
                break
            reply += got
    text = reply.rstrip(b"\0").decode("utf-8", "replace")
    if text.endswith(" OK"):
        return {"result": "clean"}
    if text.endswith(" FOUND"):
        return {"result": "infected", "signature": text.split(": ", 1)[-1][: -len(" FOUND")]}
    return {"result": "error", "detail": text[:200]}


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, body):
        raw = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        # The Container class pings the port to know the server is up; clamd may still be loading.
        self.reply(200, {"ok": True})

    def do_POST(self):
        if self.path != "/scan":
            return self.reply(404, {"result": "error", "detail": "not found"})
        n = int(self.headers.get("content-length") or 0)
        if n <= 0 or n > MAX_BODY:
            return self.reply(413, {"result": "error", "detail": "bad size"})
        data = self.rfile.read(n)
        try:
            self.reply(200, scan(data))
        except OSError as e:
            self.reply(503, {"result": "error", "detail": f"clamd unavailable: {e}"})

    def log_message(self, *args):
        pass  # file names and contents never reach the logs


ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
