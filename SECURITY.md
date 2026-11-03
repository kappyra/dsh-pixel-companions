# Security policy

## Supported versions

The latest published release of `dsh-pixel-companions` receives security fixes. Older
versions are not maintained.

## Reporting a vulnerability

Please **do not open a public issue** for a vulnerability. Use GitHub's private
vulnerability reporting: open the repository's **Security** tab and choose
**Report a vulnerability**, or email the address on the maintainer's GitHub profile.

I aim to acknowledge a report within a few days and to publish a fix and an advisory once
a patch is available. Please give me a reasonable window to release before disclosing
publicly.

## Scope

The plugin is browser-side code for the DeepSeek Harness Web client plus an optional local
Python desktop window:

- the browser bundle registers two slot entries and reads public slot props; it makes no
  network calls beyond the plugin's own asset route;
- the desktop bridge listens on `127.0.0.1:37421` only and carries scene, character, scale
  and animation — never prompts, drafts, messages, session ids, file paths or model output;
- preferences live in the browser's `localStorage`; the desktop window keeps its own
  preferences under `~/.config/dsh-pixel-companions/`.

Reports about dependency vulnerabilities, the plugin's asset route, the localhost bridge,
or any way the plugin could read more session data than the public slot props expose are
in scope.

## Repository hygiene

The repository is scanned with secret scanners (`gitleaks`, `trufflehog`,
`detect-secrets`) and `npm audit`; the allowlisted `gitleaks` finding is the `localStorage`
key name, not a credential. No credentials, tokens, cookies or machine-specific paths are
committed.
