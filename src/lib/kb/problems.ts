// The problems inside a merged ticket. Counts follow the desk's own view (causes.ts): every report
// is filed under its tenant's cause. Reports the desk read differently (desk-notes.json) stay
// filed there, and are also tracked as a problem of their own: a one-day move is not a swap.
import notes from '#lib/data/desk-notes.json';
import { groupByCause, uniqueById, type CauseGroup, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = CauseGroup['cause'] | 'one-day';

export const PROBLEMS: Record<Problem, { title: string; what: string }> = {
  parser: {
    title: 'Shared parser reads day-first dates month first',
    what: 'A day-first tenant books 7 April; the invite says 4 July. Every channel (app, email, booking-v2 forms).',
  },
  hint: {
    title: 'booking-v3 form hint says MM/DD/YYYY to day-first tenants',
    what: 'People type what the hint tells them, month first; the form reads it the tenant’s way. Only form reports from booking-v3 tenants.',
  },
  'one-day': {
    title: 'Dates move by one day, not by a month',
    what: 'Tuesday becomes Monday; one meeting lands on two days for people in two time zones. Not a day/month swap.',
  },
  unplaced: {
    title: 'No cause found',
    what: 'No tenant on file, or the tenant writes the month first.',
  },
};

// Where each problem is tracked now that #4471 no longer stands for all of them.
export const TICKETS: Partial<Record<Problem, string>> = {
  parser: 'https://github.com/moramezan/support-kb-4471/issues/1',
  hint: 'https://github.com/moramezan/support-kb-4471/issues/2',
  'one-day': 'https://github.com/moramezan/support-kb-4471/issues/3',
};

export type ProblemRow = {
  problem: Problem;
  reports: Report[];
  filedUnder: CauseGroup['cause'] | null; // set on a row that is a subset of another row
  tenants: string[];
  channels: Record<string, number>;
  intakeAgrees: number | null;
  firstSeen: string;
  lastSeen: string;
};

function row(problem: Problem, rs: Report[], filedUnder: ProblemRow['filedUnder']): ProblemRow {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    filedUnder,
    tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
    channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
    intakeAgrees: filedUnder ? null : rs.filter((r) => r.meta.intakeTag === problem).length,
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

export function problemsIn(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[] = notes.oneDayMove,
): { merged: Report[]; rows: ProblemRow[]; filed: number } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const groups = groupByCause(merged, tenantOf);
  const rows: ProblemRow[] = [];
  for (const g of groups) {
    rows.push(row(g.cause, g.reports, null));
    const moved = g.reports.filter((r) => oneDayMove.includes(r.id));
    if (moved.length) rows.push(row('one-day', moved, g.cause));
  }
  return { merged, rows, filed: groups.reduce((n, g) => n + g.reports.length, 0) };
}
