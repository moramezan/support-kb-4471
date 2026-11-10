// The problems inside a merged ticket. causes.ts says which code path a report went through;
// this file also takes out the reports the desk itself read differently (desk-notes.json):
// those are a different bug, not a footnote.
import notes from '#lib/data/desk-notes.json';
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

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

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[] = notes.oneDayMove): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  intakeAgrees: number; // reports whose intake tag names this same problem
  firstSeen: string;
  lastSeen: string;
};

export function problemsIn(all: Report[], ticket: number, tenantOf: (r: Report) => Tenant | undefined): { merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<Problem, Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r));
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
        intakeAgrees: rs.filter((r) => r.meta.intakeTag === problem).length,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { merged, groups };
}
