<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import { problemsIn, PROBLEMS, TICKETS } from '#lib/kb/problems';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  let { ticket, ids = false }: { ticket: number; ids?: boolean } = $props();

  const all = reports as Report[];
  const view = $derived(problemsIn(all, ticket, tenantOf));
  const problems = $derived(new Set(view.rows.map((r) => r.problem)).size);
  const channels = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ×${n}`)
      .join(' · ');
</script>

{#if !ids}
<p class="sum">
  <strong>{view.merged.length}</strong> reports merged into #{ticket}
  ({all.length} rows in the export, {all.length - view.merged.length} of them repeats) ·
  <strong>{problems}</strong> {problems === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>channels</th><th>intake agreed</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each view.rows as g (g.problem)}
      <tr class:sub={g.filedUnder}>
        <td>
          <b>{PROBLEMS[g.problem].title}</b><br /><span class="what">{PROBLEMS[g.problem].what}</span>
          {#if g.filedUnder}<br /><span class="what">Filed under <code>{g.filedUnder}</code> by tenant, so also counted in that row.</span>{/if}
        </td>
        <td class="n">{g.filedUnder ? `(${g.reports.length})` : g.reports.length}</td>
        <td class="n">{g.tenants.length}</td>
        <td class="small">{channels(g.channels)}</td>
        <td class="n">{g.intakeAgrees === null ? '—' : `${g.intakeAgrees} of ${g.reports.length}`}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if TICKETS[g.problem]}<a href={TICKETS[g.problem]}>#{TICKETS[g.problem]?.split('/').pop()}</a>{:else}<span class="warn">none</span>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
  <tfoot>
    <tr><td>total filed</td><td class="n" class:warn={view.filed !== view.merged.length}>{view.filed}</td><td colspan="5"></td></tr>
  </tfoot>
</table>
{:else}
  {#each view.rows as g (g.problem)}
    <details>
      <summary>{PROBLEMS[g.problem].title}: {g.reports.length} report ids</summary>
      <p class="ids">{g.reports.map((r) => r.id).join(' ')}</p>
    </details>
  {/each}
{/if}

<style>
  .sum { font-size: 1.05rem; }
  .what { color: var(--muted); font-size: 0.85em; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .small { font-size: 0.85em; color: var(--muted); }
  .warn { color: var(--warn); font-weight: 600; }
  .sub td:first-child { padding-left: 1.5rem; }
  tfoot td { font-weight: 600; border-bottom: 0; }
  .ids { font: 0.78rem var(--mono); color: var(--muted); word-spacing: 0.3em; }
  details { margin: 0.4rem 0; }
</style>
