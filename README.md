# Secstant mixed-language scope preflight reproduction

This is a minimal monorepo for reproducing a legacy Secstant preflight bug.

The repository intentionally has:

- a Foundry/Solidity project under `contracts/`;
- a Go module under `go-service/`;
- pinned external Solidity dependencies matching the customer setup;
- no `go.mod` or `go.work` at the repository root.

Secstant therefore detects both Go and Solidity from the full repository. The
scan scope should contain only `contracts/src/Counter.sol`.

## Required scope

Use this repository entry in the customer request, replacing the URL and commit:

```json
{
  "clone_url": "https://github.com/<owner>/<repo>",
  "commit_sha": "<commit-sha>",
  "files": [
    {
      "path": "contracts/src/Counter.sol",
      "tokens": 100
    }
  ],
  "name": "<owner>/<repo>"
}
```

Do not provide `audit_subdir`.

For the closest end-to-end reproduction, create the GitHub repository as
private and provide a fine-grained PAT with read access to repository contents.
The bug itself does not require a private repository, but this also exercises
the customer credential path.

## External dependencies

The scoped Solidity contract imports:

```text
@chainlink/contracts@1.5.0
@openzeppelin/contracts@5.4.0
```

Only `package.json` and `package-lock.json` should be committed. Do not commit
`node_modules`; Secstant should install these dependencies during Docker build.

## Expected result

Before the fix, repository inspection produces:

```text
configured languages = go, solidity
effective languages  = solidity
```

Legacy filesystem validation nevertheless checks the unfiltered configured
languages and stops before Docker with:

```text
missing go.mod or go.work in .
```

The target degrades directly to syntax mode and `.docker-build` remains empty.

After `filesystem-validation.ts` uses
`resolveEffectiveTargetLanguages(config)`, Go is excluded from this scoped
build and Secstant proceeds into the Solidity Docker build.

## Vulnerable-code fixtures (Python, TypeScript)

`python-service/` and `typescript-service/` are separate from the Go/Rust
scope-noise fixtures above: they are meant to actually be scanned, not
excluded. Each route/function contains one deliberately introduced
vulnerability, labelled inline with its CWE, so a scan has a known set of
findings to check against.

| File | CWE | Issue |
| --- | --- | --- |
| `python-service/app.py` | CWE-798 | Hard-coded API secret |
| `python-service/app.py` | CWE-89 | SQL injection via f-string query |
| `python-service/app.py` | CWE-78 | Command injection via `shell=True` |
| `python-service/app.py` | CWE-502 | Unsafe `pickle.loads` on request body |
| `python-service/app.py` | CWE-22 | Path traversal in file read route |
| `python-service/app.py` | CWE-327 | MD5 used for password hashing |
| `python-service/app.py` | CWE-489 | Flask debug mode enabled |
| `typescript-service/src/index.ts` | CWE-798 | Hard-coded JWT signing secret |
| `typescript-service/src/index.ts` | CWE-89 | SQL injection via string concatenation |
| `typescript-service/src/index.ts` | CWE-78 | Command injection via `exec` |
| `typescript-service/src/index.ts` | CWE-347 | JWT decoded without signature verification |
| `typescript-service/src/index.ts` | CWE-22 | Path traversal in file read route |
| `typescript-service/src/index.ts` | CWE-1321 | Prototype pollution in recursive merge |

Example scope entries to scan just these fixtures:

```json
{
  "path": "python-service/app.py"
}
```

```json
{
  "path": "typescript-service/src/index.ts"
}
```

## Fixture invariants

Run this from the repository root before pushing:

```bash
test ! -f go.mod
test ! -f go.work
test -f go-service/go.mod
test -f contracts/foundry.toml
test -f contracts/src/Counter.sol
test -f contracts/package-lock.json
```

The Solidity project has no external dependencies, keeping any post-fix build
failure separate from dependency installation or submodule access.
