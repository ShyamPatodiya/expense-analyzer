import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { Options } from 'highcharts';
import type { Transaction } from '../types';
import { getMonthlySummary, getCategoryBreakdown, getTopExpenses, getTopIncomes } from '../services/dataAnalysis';
import { format } from 'date-fns';

interface ChartsProps {
  transactions: Transaction[];
  dateRange: { start: Date | null; end: Date | null };
  darkMode?: boolean;
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6',
];

const MAX_BAR_LABEL_LENGTH = 14;
function barLabel(text: string): string {
  if (!text) return '';
  if (text.length <= MAX_BAR_LABEL_LENGTH) return text;
  return text.slice(0, MAX_BAR_LABEL_LENGTH) + '…';
}

/** Base chart options for theme (dark/light) – aligned with Tailwind gray-800 / white */
function getChartTheme(darkMode: boolean): Partial<Options> {
  const text = darkMode ? '#e5e7eb' : '#111827';
  const grid = darkMode ? '#374151' : '#d1d5db';
  const gridSoft = darkMode ? 'rgba(156,163,175,0.25)' : 'rgba(0,0,0,0.06)';
  const bg = darkMode ? '#1f2937' : '#ffffff';
  const border = darkMode ? '#4b5563' : '#e5e7eb';
  return {
    chart: {
      backgroundColor: bg,
      style: { fontFamily: 'inherit' },
    },
    title: { text: undefined, style: { color: text } },
    xAxis: {
      labels: { style: { color: text, fontSize: '11px' } },
      lineColor: grid,
      tickColor: grid,
      gridLineColor: gridSoft,
    },
    yAxis: {
      labels: { style: { color: text, fontSize: '11px' } },
      lineColor: grid,
      tickColor: grid,
      gridLineColor: gridSoft,
      gridLineDashStyle: 'Dash',
    },
    legend: {
      itemStyle: { color: text },
      itemHoverStyle: { color: text },
    },
    tooltip: {
      backgroundColor: darkMode ? 'rgba(31,41,55,0.96)' : 'rgba(255,255,255,0.98)',
      borderColor: border,
      style: { color: darkMode ? '#f9fafb' : '#111827' },
      borderRadius: 12,
      padding: 12,
    },
    credits: { enabled: false },
    responsive: {
      rules: [
        {
          condition: { maxWidth: 480 },
          chartOptions: {
            xAxis: { labels: { style: { fontSize: '9px' } } },
            yAxis: { labels: { style: { fontSize: '9px' } } },
            legend: { itemStyle: { fontSize: '10px' } },
          },
        },
      ],
    },
  };
}

export function Charts({ transactions, dateRange, darkMode = false }: ChartsProps) {
  const filtered =
    dateRange.start && dateRange.end
      ? transactions.filter((t) => {
          const d = new Date(t.transactionDate);
          return d >= dateRange.start! && d <= dateRange.end!;
        })
      : transactions;

  const monthly = getMonthlySummary(filtered);
  const categoryData = getCategoryBreakdown(filtered);
  const topExpenses = getTopExpenses(filtered, 10).map((t) => ({
    name: barLabel(t.transactionDetails),
    fullName: t.transactionDetails,
    amount: Math.abs(t.debitCredit),
  }));
  const topIncomes = getTopIncomes(filtered, 10).map((t) => ({
    name: barLabel(t.transactionDetails),
    fullName: t.transactionDetails,
    amount: t.debitCredit,
  }));

  const byDay = new Map<string, number>();
  for (const t of filtered) {
    if (t.debitCredit < 0) {
      const key = format(new Date(t.transactionDate), 'yyyy-MM-dd');
      byDay.set(key, (byDay.get(key) ?? 0) + Math.abs(t.debitCredit));
    }
  }
  const dailyTrend = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount }));

  const sortedTx = [...filtered].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );
  const balanceOverTime = sortedTx.map((t) => {
    const d = new Date(t.transactionDate);
    return {
      date: format(d, 'MMM dd'),
      fullDate: format(d, 'MMM dd, yyyy'),
      balance: t.balance,
    };
  });

  const theme = useMemo(() => getChartTheme(darkMode), [darkMode]);

  const monthlyOptions = useMemo<Options>(() => ({
    ...theme,
    chart: { ...theme.chart, type: 'column' },
    xAxis: {
      ...theme.xAxis,
      categories: monthly.map((m) => m.month),
      crosshair: true,
    },
    yAxis: { ...theme.yAxis },
    plotOptions: {
      column: {
        borderRadius: 4,
        pointPadding: 0.1,
        groupPadding: 0.15,
      },
    },
    series: [
      { type: 'column', name: 'Income', data: monthly.map((m) => m.income), color: '#22c55e' },
      { type: 'column', name: 'Expense', data: monthly.map((m) => m.expense), color: '#ef4444' },
    ],
    tooltip: {
      ...theme.tooltip,
      shared: true,
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        const p = this.points ?? [];
        let s = `<b>${this.x}</b><br/>`;
        (p as Array<{ series: { name: string }; y?: number | null }>).forEach((pt) => {
          s += `${pt.series.name}: ${Number(pt.y ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}<br/>`;
        });
        return s;
      },
    },
  }), [theme, monthly]);

  const pieData = useMemo(
    () =>
      categoryData.map((entry, i) => ({
        name: entry.category,
        y: entry.amount,
        color: COLORS[i % COLORS.length],
        percentage: entry.percentage ?? 0,
      })),
    [categoryData]
  );

  const pieOptions = useMemo<Options>(() => ({
    ...theme,
    chart: { ...theme.chart, type: 'pie' },
    plotOptions: {
      pie: {
        size: '75%',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b><br/>{point.percentage:.1f}%',
          style: { color: theme.tooltip?.style?.color ?? undefined, textOutline: 'none' },
        },
        showInLegend: true,
        cursor: 'pointer',
        point: {
          events: {
            mouseOver: function (this: Highcharts.Point) {
              this.update({ sliced: true }, false);
            },
            mouseOut: function (this: Highcharts.Point) {
              this.update({ sliced: false }, false);
            },
          },
        },
      },
    },
    series: [
      {
        type: 'pie',
        name: 'Amount',
        data: pieData,
        innerSize: 0,
      },
    ],
    tooltip: {
      ...theme.tooltip,
      pointFormat: '<b>{point.y:,.0f}</b> ({point.percentage:.1f}%)',
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        const p = this.point as Highcharts.Point & { y: number; percentage: number };
        return `<b>${this.key}</b><br/>₹${p.y.toLocaleString('en-IN')} (${p.percentage?.toFixed(1) ?? 0}%)`;
      },
    },
    legend: {
      ...theme.legend,
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
      itemMarginBottom: 4,
      labelFormatter: function (this: Highcharts.Point | Highcharts.Series) {
        const point = this as Highcharts.Point & { name?: string; percentage?: number };
        const name = point.name ?? (this as Highcharts.Series).name ?? '';
        const pct = point.percentage ?? 0;
        return `${name} (${pct.toFixed(1)}%)`;
      },
    },
  }), [theme, pieData]);

  const balanceOptions = useMemo<Options>(() => ({
    ...theme,
    chart: { ...theme.chart, type: 'area' },
    xAxis: {
      ...theme.xAxis,
      categories: balanceOverTime.map((d) => d.date),
      crosshair: true,
    },
    yAxis: {
      ...(Array.isArray(theme.yAxis) ? theme.yAxis[0] : theme.yAxis),
      labels: {
        ...(Array.isArray(theme.yAxis) ? undefined : theme.yAxis?.labels),
        formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
          const v = Number(this.value) / 1000;
          return `₹${v.toFixed(0)}k`;
        },
      },
    },
    plotOptions: {
      area: {
        fillOpacity: 0.3,
        lineWidth: 2,
        marker: { enabled: false },
      },
    },
    series: [
      {
        type: 'area',
        name: 'Balance',
        data: balanceOverTime.map((d) => ({ y: d.balance, fullDate: d.fullDate })),
        color: '#6366f1',
      },
    ],
    tooltip: {
      ...theme.tooltip,
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        const point = this.point as Highcharts.Point & { options: { fullDate?: string } };
        const fullDate = point.options?.fullDate ?? this.x;
        const y = this.y as number;
        return `<b>${fullDate}</b><br/>Balance: ₹${y.toLocaleString('en-IN')}`;
      },
    },
  }), [theme, balanceOverTime]);

  const dailyOptions = useMemo<Options>(() => ({
    ...theme,
    chart: { ...theme.chart, type: 'line' },
    xAxis: {
      ...theme.xAxis,
      categories: dailyTrend.map((d) => d.date),
      crosshair: true,
    },
    yAxis: {
      ...(Array.isArray(theme.yAxis) ? theme.yAxis[0] : theme.yAxis),
      labels: {
        ...(Array.isArray(theme.yAxis) ? undefined : theme.yAxis?.labels),
        formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
          const v = Number(this.value) / 1000;
          return `₹${v.toFixed(0)}k`;
        },
      },
    },
    plotOptions: {
      line: {
        lineWidth: 2,
        marker: { enabled: false },
      },
    },
    series: [
      {
        type: 'line',
        name: 'Spent',
        data: dailyTrend.map((d) => d.amount),
        color: '#f97316',
      },
    ],
    tooltip: {
      ...theme.tooltip,
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        const y = this.y as number;
        return `<b>${this.x}</b><br/>Spent: ₹${y.toLocaleString('en-IN')}`;
      },
    },
  }), [theme, dailyTrend]);

  const topExpensesOptions = useMemo<Options>(() => ({
    ...theme,
    chart: { ...theme.chart, type: 'bar', inverted: true },
    xAxis: {
      ...theme.xAxis,
      categories: topExpenses.map((d) => d.name),
      labels: { style: { fontSize: '10px', color: darkMode ? '#ffffff' : '#111827' } },
    },
    yAxis: {
      ...(Array.isArray(theme.yAxis) ? theme.yAxis[0] : theme.yAxis),
      labels: {
        ...(Array.isArray(theme.yAxis) ? undefined : theme.yAxis?.labels),
        style: { color: darkMode ? '#ffffff' : '#111827' },
        formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
          const v = Number(this.value) / 1000;
          return `₹${v.toFixed(0)}k`;
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        dataLabels: { enabled: false },
        states: {
          hover: {
            brightness: 0.1,
            borderWidth: 2,
            borderColor: darkMode ? '#fca5a5' : '#b91c1c',
            shadow: true,
          },
          inactive: {
            opacity: 0.65,
          },
        },
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Amount',
        data: topExpenses.map((d) => ({ y: d.amount, fullName: d.fullName })),
        color: '#ef4444',
      },
    ],
    tooltip: {
      ...theme.tooltip,
      useHTML: true,
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        const p = this.point as Highcharts.Point & { y: number; fullName?: string };
        const name = (p.options as { fullName?: string }).fullName ?? p.name ?? '';
        return `<div style="max-width:320px;word-break:break-word">${name}</div><br/><b>₹${(p.y ?? 0).toLocaleString('en-IN')}</b>`;
      },
    },
    legend: { enabled: false },
  }), [theme, topExpenses, darkMode]);

  const topIncomesOptions = useMemo<Options>(() => ({
    ...theme,
    chart: { ...theme.chart, type: 'bar', inverted: true },
    xAxis: {
      ...theme.xAxis,
      categories: topIncomes.map((d) => d.name),
      labels: { style: { fontSize: '10px', color: darkMode ? '#ffffff' : '#111827' } },
    },
    yAxis: {
      ...(Array.isArray(theme.yAxis) ? theme.yAxis[0] : theme.yAxis),
      labels: {
        ...(Array.isArray(theme.yAxis) ? undefined : theme.yAxis?.labels),
        style: { color: darkMode ? '#ffffff' : '#111827' },
        formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
          const v = Number(this.value) / 1000;
          return `₹${v.toFixed(0)}k`;
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        dataLabels: { enabled: false },
        states: {
          hover: {
            brightness: 0.1,
            borderWidth: 2,
            borderColor: darkMode ? '#86efac' : '#15803d',
            shadow: true,
          },
          inactive: {
            opacity: 0.65,
          },
        },
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Amount',
        data: topIncomes.map((d) => ({ y: d.amount, fullName: d.fullName })),
        color: '#22c55e',
      },
    ],
    tooltip: {
      ...theme.tooltip,
      useHTML: true,
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        const p = this.point as Highcharts.Point & { y: number; fullName?: string };
        const name = (p.options as { fullName?: string }).fullName ?? p.name ?? '';
        return `<div style="max-width:320px;word-break:break-word">${name}</div><br/><b>₹${(p.y ?? 0).toLocaleString('en-IN')}</b>`;
      },
    },
    legend: { enabled: false },
  }), [theme, topIncomes, darkMode]);

  const hasData = filtered.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Upload a statement or adjust the date filter on the Transactions page.
        </p>
      </div>
    );
  }

  /** Fixed height so Highcharts gets a definite container size (percentage height often fails). */
  const chartHeight = 380;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Monthly Income vs Expense
        </h3>
        <div style={{ width: '100%', height: chartHeight }}>
          <HighchartsReact highcharts={Highcharts} options={monthlyOptions} containerProps={{ style: { width: '100%', height: '100%' } }} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Category Breakdown
        </h3>
        <div style={{ width: '100%', height: chartHeight }}>
          <HighchartsReact highcharts={Highcharts} options={pieOptions} containerProps={{ style: { width: '100%', height: '100%' } }} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Balance Over Time
        </h3>
        <div style={{ width: '100%', height: chartHeight }}>
          <HighchartsReact highcharts={Highcharts} options={balanceOptions} containerProps={{ style: { width: '100%', height: '100%' } }} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Daily Spending Trend
        </h3>
        <div style={{ width: '100%', height: chartHeight }}>
          <HighchartsReact highcharts={Highcharts} options={dailyOptions} containerProps={{ style: { width: '100%', height: '100%' } }} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Top 10 Expenses
        </h3>
        <div style={{ width: '100%', height: chartHeight }}>
          <HighchartsReact highcharts={Highcharts} options={topExpensesOptions} containerProps={{ style: { width: '100%', height: '100%' } }} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Top 10 Incomes
        </h3>
        <div style={{ width: '100%', height: chartHeight }}>
          <HighchartsReact highcharts={Highcharts} options={topIncomesOptions} containerProps={{ style: { width: '100%', height: '100%' } }} />
        </div>
      </div>
    </div>
  );
}
