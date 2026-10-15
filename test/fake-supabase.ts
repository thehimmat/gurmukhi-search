// A small in-memory stand-in for the supabase-js query builder: enough of
// select/filter/order/range/limit to run the feed and search queries against
// fixture rows. Each executed query is logged so tests can assert on how the
// database was asked, not just what came back.

type Row = Record<string, unknown>;
type Pred = (r: Row) => boolean;

export type QueryLog = { table: string; head: boolean; filters: string[]; limit?: number };
export type RpcLog = { fn: string; args: Record<string, unknown> };
type RpcHandler = (args: Record<string, unknown>) => unknown[];

export function fakeSupabase(tables: Record<string, Row[]>, rpcs: Record<string, RpcHandler> = {}) {
  const log: QueryLog[] = [];
  const rpcLog: RpcLog[] = [];

  function rpc(fn: string, args: Record<string, unknown>) {
    rpcLog.push({ fn, args });
    const handler = rpcs[fn];
    return Promise.resolve(handler
      ? { data: handler(args), error: null }
      : { data: null, error: { message: `no fake for rpc ${fn}` } });
  }

  function from(table: string) {
    const preds: Pred[] = [];
    const desc: string[] = [];
    const orders: Array<{ col: string; asc: boolean }> = [];
    let head = false;
    let count = false;
    let lim: number | undefined;
    let from_ = 0;

    const like = (pattern: string) =>
      new RegExp('^' + pattern.split('%').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 's');

    const b = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        head = !!opts?.head; count = !!opts?.count; return b;
      },
      eq(c: string, v: unknown) { desc.push(`${c}=${v}`); preds.push(r => r[c] === v); return b; },
      gt(c: string, v: number) { desc.push(`${c}>${v}`); preds.push(r => (r[c] as number) > v); return b; },
      gte(c: string, v: number) { desc.push(`${c}>=${v}`); preds.push(r => (r[c] as number) >= v); return b; },
      lt(c: string, v: number) { desc.push(`${c}<${v}`); preds.push(r => (r[c] as number) < v); return b; },
      lte(c: string, v: number) { desc.push(`${c}<=${v}`); preds.push(r => (r[c] as number) <= v); return b; },
      in(c: string, vs: unknown[]) { desc.push(`${c} in ${vs}`); preds.push(r => vs.includes(r[c])); return b; },
      like(c: string, p: string) { desc.push(`${c} like ${p}`); const re = like(p); preds.push(r => re.test(String(r[c]))); return b; },
      ilike(c: string, p: string) { desc.push(`${c} ilike ${p}`); const re = like(p); preds.push(r => re.test(String(r[c]))); return b; },
      order(col: string, o?: { ascending?: boolean }) { orders.push({ col, asc: o?.ascending !== false }); return b; },
      limit(n: number) { lim = n; return b; },
      range(a: number, z: number) { from_ = a; lim = z - a + 1; return b; },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        log.push({ table, head, filters: desc, limit: lim });
        let rows = (tables[table] ?? []).filter(r => preds.every(p => p(r)));
        rows = [...rows].sort((x, y) => {
          for (const { col, asc } of orders) {
            const a = x[col] as number, z = y[col] as number;
            if (a !== z) return (a < z ? -1 : 1) * (asc ? 1 : -1);
          }
          return 0;
        });
        const total = rows.length;
        rows = rows.slice(from_, lim === undefined ? undefined : from_ + lim);
        return Promise.resolve({ data: head ? null : rows, count: count ? total : null, error: null }).then(resolve, reject);
      },
    };
    return b;
  }

  return { client: { from, rpc }, log, rpcLog };
}
