/** Replaces `{token}` placeholders; unknown tokens are left as-is. No ICU on purpose. */
export function interpolate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
