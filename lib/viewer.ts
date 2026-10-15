// The Gurbani viewer lives in the kosh zone (/line/[id], gurmukhi-kosh#146):
// a line opens its whole shabad, scrolled to and marking the line via the
// fragment. Mirrors gurmukhi-kosh lib/line-context.ts lineHref.
export const lineHref = (id: number) => `/line/${id}#line-${id}`;
