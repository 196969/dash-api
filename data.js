// Step 3: READ-ONLY pull. Dash posts its sealed blob; we refresh the access
// token, read accounts / customers / invoices / purchases, and return them
// with a fresh sealed blob (Intuit rotates refresh tokens). Nothing is written to QuickBooks.
import { env, cors, seal, unseal, tokenRequest, API_BASE } from './_lib.js';

const QUERIES = {
  accounts: 'select * from Account maxresults 1000',
  customers: 'select * from Customer maxresults 1000',
  invoices: 'select * from Invoice maxresults 1000',
  purchases: 'select * from Purchase maxresults 1000',
};

// Intuit asks apps to keep the intuit_tid response header for support tracing.
// Every call's tid is logged server-side (Vercel logs) and returned to Dash's sync log.
function tidOf(r, call, tids) {
  const tid = r.headers.get('intuit_tid') || '';
  tids.push({ call, status: r.status, intuit_tid: tid });
  console.log(JSON.stringify({ qbo: call, status: r.status, intuit_tid: tid }));
  return tid;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const tids = [];
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const s = unseal(body.token);
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: s.r });
    const out = {};
    for (const [k, q] of Object.entries(QUERIES)) {
      const r = await fetch(`${API_BASE}/v3/company/${s.realm}/query?minorversion=75&query=${encodeURIComponent(q)}`, {
        headers: { Authorization: 'Bearer ' + t.access_token, Accept: 'application/json' },
      });
      const tid = tidOf(r, k, tids);
      const j = await r.json();
      if (!r.ok) throw new Error('QuickBooks ' + k + ' read failed (' + r.status + ', intuit_tid ' + (tid || 'n/a') + ')');
      const qr = j.QueryResponse || {};
      out[k] = qr[Object.keys(qr).find(x => Array.isArray(qr[x]))] || [];
    }
    // Income and expense accounts carry no balance on the Account list; their
    // totals live on the Profit & Loss report. Read it (year to date, same
    // accounting basis) and fill each P&L account's balance from its report row,
    // so Compare-to-Dash sees real revenue and expenses. Still read-only.
    const pl = { revenue: 0, expenses: 0, net: 0, period: 'This fiscal year to date' };
    try {
      const r = await fetch(`${API_BASE}/v3/company/${s.realm}/reports/ProfitAndLoss?minorversion=75&date_macro=This%20Fiscal%20Year-to-date`, {
        headers: { Authorization: 'Bearer ' + t.access_token, Accept: 'application/json' },
      });
      tidOf(r, 'ProfitAndLoss', tids);
      if (r.ok) {
        const rep = await r.json();
        const byId = {};
        const walk = rows => (rows || []).forEach(row => {
          if (row.ColData && row.ColData[0] && row.ColData[0].id) {
            const v = parseFloat(row.ColData[row.ColData.length - 1].value);
            if (!isNaN(v)) byId[row.ColData[0].id] = (byId[row.ColData[0].id] || 0) + v;
          }
          if (row.Rows) walk(row.Rows.Row);
          if (row.Summary && row.group) {
            const v = parseFloat(row.Summary.ColData[row.Summary.ColData.length - 1].value);
            if (!isNaN(v)) {
              if (row.group === 'Income') pl.revenue = v;
              if (row.group === 'Expenses' || row.group === 'OtherExpenses' || row.group === 'COGS') pl.expenses += v;
              if (row.group === 'NetIncome') pl.net = v;
            }
          }
        });
        walk(rep.Rows && rep.Rows.Row);
        const PL = ['Income', 'Other Income', 'Expense', 'Other Expense', 'Cost of Goods Sold'];
        out.accounts.forEach(a => {
          if (PL.includes(a.AccountType) && byId[a.Id] !== undefined) {
            a.CurrentBalance = byId[a.Id];
            a.BalanceSource = 'Profit & Loss report, year to date';
          }
        });
      }
    } catch (_) { /* P&L is best-effort; the account lists still return */ }
    res.status(200).json({
      connected: true,
      pl,
      environment: env('QBO_ENV', 'sandbox'),
      realm: s.realm,
      syncedAt: new Date().toISOString(),
      counts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])),
      data: out,
      log: tids,
      token: seal({ r: t.refresh_token || s.r, realm: s.realm, at: Date.now() }),
    });
  } catch (e) {
    console.error(JSON.stringify({ qbo: 'error', error: e.message, tids }));
    res.status(200).json({ connected: false, error: e.message, log: tids, reconnect: /invalid_grant|token error|401/i.test(e.message) });
  }
}
