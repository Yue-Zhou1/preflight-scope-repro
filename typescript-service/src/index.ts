/**
 * Intentionally vulnerable Express service.
 *
 * Fixture for exercising Secstant's TypeScript audit path. Every route below
 * contains a deliberately introduced vulnerability, labelled with its CWE,
 * so a scan against this file has a known set of findings to match against.
 */
import { exec } from "child_process";
import express, { Request, Response } from "express";
import fs from "fs";
import jwt from "jsonwebtoken";
import path from "path";

const app = express();
app.use(express.json());

// CWE-798: Use of Hard-coded Credentials
const JWT_SECRET = "super-secret-jwt-signing-key-2024";

interface DbRow {
  id: number;
  username: string;
}

function fakeQuery(sql: string): DbRow[] {
  // Stand-in for a real driver call; the vulnerability is the caller
  // building `sql` via string concatenation below.
  return [{ id: 1, username: sql }];
}

app.get("/users/:username", (req: Request, res: Response) => {
  const { username } = req.params;
  // CWE-89: SQL Injection via string concatenation into a raw query
  const sql = "SELECT id, username FROM users WHERE username = '" + username + "'";
  res.json(fakeQuery(sql));
});

app.get("/ping", (req: Request, res: Response) => {
  const host = (req.query.host as string) ?? "127.0.0.1";
  // CWE-78: OS Command Injection via unsanitized shell input
  exec(`ping -c 1 ${host}`, (err, stdout) => {
    res.json({ output: stdout, error: err?.message });
  });
});

app.get("/verify", (req: Request, res: Response) => {
  const token = req.query.token as string;
  // CWE-347: Improper Verification of Cryptographic Signature —
  // accepts the "none" algorithm and any attacker-chosen alg, so a token
  // can be forged without knowing JWT_SECRET.
  const decoded = jwt.decode(token);
  res.json({ decoded });
});

app.get("/files/:name", (req: Request, res: Response) => {
  // CWE-22: Path Traversal — user input joined into a filesystem path
  // without normalization against an allowlisted base directory.
  const filePath = path.join(__dirname, "uploads", req.params.name);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(404).send("not found");
      return;
    }
    res.send(data);
  });
});

function merge(target: Record<string, unknown>, source: Record<string, unknown>) {
  // CWE-1321: Prototype Pollution — no key filtering on __proto__/constructor
  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null) {
      target[key] = merge((target[key] as Record<string, unknown>) ?? {}, source[key] as Record<string, unknown>);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

app.post("/settings", (req: Request, res: Response) => {
  const settings = merge({}, req.body);
  res.json(settings);
});

app.listen(3000, () => {
  console.log("listening on :3000");
});
