import { useMemo, useState } from 'react';
import { Profile } from '../lib/supabase';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Panel from './ui/Panel';

type Period = 'week' | 'month' | 'year';

interface Bucket {
  label: string;
  fullLabel: string;
  count: number;
}

const PERIOD_LABEL: Record<Period, string> = {
  week: 'Semana',
  month: 'Mês',
  year: 'Ano',
};

/** Segunda-feira da semana da data informada. */
function startOfWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function buildBuckets(period: Period, users: Profile[], now: Date): Bucket[] {
  const ranges: { from: Date; to: Date; label: string; fullLabel: string }[] = [];

  if (period === 'week') {
    const currentWeek = startOfWeek(now);
    for (let i = 7; i >= 0; i--) {
      const from = new Date(currentWeek);
      from.setDate(from.getDate() - i * 7);
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      const label = from.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      ranges.push({ from, to, label, fullLabel: `Semana de ${label}` });
    }
  } else if (period === 'month') {
    for (let i = 11; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      ranges.push({
        from,
        to,
        label: from.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        fullLabel: from.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      });
    }
  } else {
    const years = users.map(u => new Date(u.created_at).getFullYear()).filter(y => !Number.isNaN(y));
    const firstYear = years.length > 0 ? Math.min(...years) : now.getFullYear();
    for (let year = firstYear; year <= now.getFullYear(); year++) {
      ranges.push({
        from: new Date(year, 0, 1),
        to: new Date(year + 1, 0, 1),
        label: String(year),
        fullLabel: String(year),
      });
    }
  }

  const timestamps = users.map(u => new Date(u.created_at).getTime()).filter(t => !Number.isNaN(t));

  return ranges.map(({ from, to, label, fullLabel }) => ({
    label,
    fullLabel,
    count: timestamps.filter(t => t >= from.getTime() && t < to.getTime()).length,
  }));
}

export default function UserGrowthPanel({ users }: { users: Profile[] }) {
  const [period, setPeriod] = useState<Period>('month');

  const buckets = useMemo(() => buildBuckets(period, users, new Date()), [period, users]);

  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const current = buckets[buckets.length - 1]?.count ?? 0;
  const previous = buckets[buckets.length - 2]?.count ?? 0;
  const totalInRange = buckets.reduce((sum, b) => sum + b.count, 0);

  const delta = current - previous;
  const deltaPercent = previous > 0 ? Math.round((delta / previous) * 100) : current > 0 ? 100 : 0;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted';

  // Rótulos diretos apenas no pico e no período atual — nunca em toda barra.
  const peakIndex = buckets.reduce((best, b, i) => (b.count > buckets[best].count ? i : best), 0);

  return (
    <Panel className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-fg leading-none">Novos Usuários</h2>
          <p className="text-sm text-muted mt-1.5">
            {period === 'week' && 'Últimas 8 semanas'}
            {period === 'month' && 'Últimos 12 meses'}
            {period === 'year' && 'Todos os anos'}
            {' · '}
            {totalInRange} no período
          </p>
        </div>

        <div
          className="flex gap-1 p-1 rounded-md bg-edge/30 shrink-0"
          role="group"
          aria-label="Agrupar novos usuários por período"
        >
          {(Object.keys(PERIOD_LABEL) as Period[]).map(key => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              aria-pressed={period === key}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                period === key ? 'bg-volt text-volt-ink shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              {PERIOD_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-6">
        <span className="font-display font-bold text-4xl leading-none text-fg font-tabular">{current}</span>
        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          {delta > 0 ? '+' : ''}
          {deltaPercent}%
        </span>
        <span className="text-sm text-muted">
          {period === 'week' && 'nesta semana'}
          {period === 'month' && 'neste mês'}
          {period === 'year' && 'neste ano'}
        </span>
      </div>

      <div className="relative">
        {/* Linha de base recessiva */}
        <div className="absolute inset-x-0 bottom-6 h-px bg-edge" aria-hidden="true" />

        <div className="flex items-end gap-0.5 h-44">
          {buckets.map((bucket, i) => {
            const heightPercent = (bucket.count / maxCount) * 100;
            const showLabel = i === peakIndex || i === buckets.length - 1;

            return (
              <div
                key={`${bucket.fullLabel}-${i}`}
                className="group relative flex-1 flex flex-col items-center h-full"
              >
                <div className="flex-1 w-full flex items-end justify-center pb-1">
                  {showLabel && bucket.count > 0 && (
                    <span className="absolute top-0 text-[11px] font-semibold text-fg font-tabular">
                      {bucket.count}
                    </span>
                  )}
                  <div
                    className="w-full max-w-10 rounded-t-[4px] bg-volt transition-opacity group-hover:opacity-80"
                    style={{ height: `${Math.max(heightPercent, bucket.count > 0 ? 3 : 0)}%` }}
                  />
                </div>

                <span className="h-6 flex items-center text-[10px] text-faint truncate w-full justify-center">
                  {bucket.label}
                </span>

                {/* Camada de hover */}
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="whitespace-nowrap rounded-md border border-edge bg-elevated px-2.5 py-1.5 shadow-lg">
                    <p className="text-[11px] text-muted capitalize">{bucket.fullLabel}</p>
                    <p className="text-sm font-bold text-fg font-tabular">
                      {bucket.count} {bucket.count === 1 ? 'usuário' : 'usuários'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
