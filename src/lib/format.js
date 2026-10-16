// Number formatting for display (2026-10-16, owner: "untuk semua angka gunakan . pemisahnya").
// Indonesian style: thousands separated by a dot (12.500), decimals by a comma (78,5).
// Use for anything shown to the user; never for <input value>, CSV or stored data.

export function fmtNum(n, maxFractionDigits = 2) {
  if (n === null || n === undefined || n === '') return n;
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return n; // leave text like 'TBC' / '—' untouched
  return x.toLocaleString('id-ID', { maximumFractionDigits: maxFractionDigits });
}

export function formatIDR(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}
