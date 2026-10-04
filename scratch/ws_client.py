import socket
import os
import base64
import json
import struct
import urllib.parse

class SimpleWebSocket:
    def __init__(self, ws_url):
        parsed = urllib.parse.urlparse(ws_url)
        self.host = parsed.hostname
        self.port = parsed.port or 80
        self.path = parsed.path
        self.sock = socket.create_connection((self.host, self.port), timeout=60)
        self.sock.settimeout(60)
        self._handshake()

    def _handshake(self):
        key = base64.b64encode(os.urandom(16)).decode('ascii')
        req = (
            f"GET {self.path} HTTP/1.1\r\n"
            f"Host: {self.host}:{self.port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(req.encode('ascii'))
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.sock.recv(4096)
        if b"101" not in resp.split(b"\r\n")[0]:
            raise RuntimeError("Handshake failed: " + resp.decode('utf-8', 'ignore'))

    def send(self, data):
        if isinstance(data, str):
            payload = data.encode('utf-8')
            opcode = 0x1
        else:
            payload = data
            opcode = 0x2
        length = len(payload)
        mask_key = os.urandom(4)
        masked_payload = bytes(b ^ mask_key[i % 4] for i, b in enumerate(payload))

        header = bytearray()
        header.append(0x80 | opcode)
        if length <= 125:
            header.append(0x80 | length)
        elif length <= 65535:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", length))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", length))
        header.extend(mask_key)
        self.sock.sendall(bytes(header) + masked_payload)

    def recv(self):
        def recv_exact(n):
            buf = bytearray()
            while len(buf) < n:
                chunk = self.sock.recv(n - len(buf))
                if not chunk:
                    raise EOFError("Connection closed")
                buf.extend(chunk)
            return bytes(buf)

        head = recv_exact(2)
        b1, b2 = head[0], head[1]
        opcode = b1 & 0x0F
        has_mask = (b2 & 0x80) != 0
        length = b2 & 0x7F
        if length == 126:
            length = struct.unpack("!H", recv_exact(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", recv_exact(8))[0]

        mask_key = recv_exact(4) if has_mask else None
        data = recv_exact(length)
        if mask_key:
            data = bytes(b ^ mask_key[i % 4] for i, b in enumerate(data))

        if opcode == 0x1:
            return data.decode('utf-8')
        elif opcode == 0x8:
            raise ConnectionResetError("WebSocket closed by remote")
        return data

    def close(self):
        try:
            self.sock.close()
        except:
            pass
