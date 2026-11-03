/**
 * Resolve one generated asset reference for the page.
 *
 * The Harness module loader hands the plugin factory a `require` with an
 * `asset()` helper, which maps a package asset reference through the current
 * page carrier. The plugin falls back to the raw document-relative reference
 * when no carrier resolver is installed.
 */
declare const require: { asset?: (reference: string) => string } | undefined

export function assetUrl(reference: string): string {
  return typeof require !== 'undefined' && typeof require.asset === 'function'
    ? require.asset(reference)
    : reference
}
