/**
 * Host half of dsh-pixel-companions.
 *
 * The companion is a browser-side contribution: `dsh.client` in package.json
 * declares the Client module, and every visual lives there. Nothing runs on the
 * Host, so activation only mounts this empty plugin row.
 */
export function apply() {}
