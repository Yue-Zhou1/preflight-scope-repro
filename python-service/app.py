"""Intentionally vulnerable Flask service.

This file is a fixture for exercising Secstant's Python audit path. Every
route below contains a deliberately introduced vulnerability, labelled with
its CWE, so that a scan against this file has a known set of findings to
match against.
"""

import hashlib
import os
import pickle
import sqlite3
import subprocess

from flask import Flask, request

app = Flask(__name__)

# CWE-798: Use of Hard-coded Credentials
API_SECRET_KEY = "sk_live_4f8a9d2e1b6c7f30d5e8a1b2c3d4e5f6"

DB_PATH = "users.db"


@app.route("/users/<username>")
def get_user(username):
    # CWE-89: SQL Injection via string formatting into a raw query
    conn = sqlite3.connect(DB_PATH)
    query = f"SELECT id, username, email FROM users WHERE username = '{username}'"
    cursor = conn.execute(query)
    row = cursor.fetchone()
    conn.close()
    return {"row": row}


@app.route("/ping")
def ping():
    host = request.args.get("host", "127.0.0.1")
    # CWE-78: OS Command Injection via unsanitized shell input
    output = subprocess.check_output(f"ping -c 1 {host}", shell=True)
    return {"output": output.decode(errors="replace")}


@app.route("/session/load", methods=["POST"])
def load_session():
    # CWE-502: Deserialization of Untrusted Data
    session_obj = pickle.loads(request.get_data())
    return {"loaded": str(session_obj)}


@app.route("/files/<path:filename>")
def read_file(filename):
    # CWE-22: Path Traversal — no normalization/allowlist against a base dir
    with open(os.path.join("uploads", filename), "rb") as f:
        return f.read()


def hash_password(password: str) -> str:
    # CWE-327: Use of a Broken/Risky Cryptographic Algorithm for password hashing
    return hashlib.md5(password.encode()).hexdigest()


if __name__ == "__main__":
    # CWE-489: debug=True exposes the Werkzeug interactive debugger/RCE in prod
    app.run(host="0.0.0.0", port=5000, debug=True)
