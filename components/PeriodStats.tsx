import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RecordEntry } from '../types';
import { getLocalDateString } from '../constants';
import { formatElapsed } from '../utils/habits';
import { buildPeriodReport, describeCountChange, describeReport, formatMinutes, getPeriodRange, PERIOD_NAMES, shiftPeriod, type ReportPeriod } from '../utils/statistics';

const panel = 'rounded-3xl border border-green-100 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80';
const button = 'min-h-11 rounded-xl border border-green-100 px-3 text-sm font-bold text-green-800 disabled:opacity-30 dark:border-slate-700 dark:text-green-300';
const localLabel = (timestamp: number) => new Date(timestamp).toLocaleDateString('zh-CN');
const cutoffLabel = (timestamp: number) => new Date(timestamp - 1).toLocaleString('zh-CN', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return <details className="mt-3 rounded-xl bg-green-50/60 px-3 py-2 text-xs dark:bg-slate-800/60">
    <summary className="cursor-pointer py-1 font-bold text-green-800 dark:text-green-300">查看详细数据</summary>
    <div className="overflow-x-auto pt-2">
      <table className="w-full text-left text-gray-600 dark:text-slate-300">
        <thead><tr>{headers.map(h => <th key={h} scope="col" className="whitespace-nowrap border-b border-green-100 px-2 py-2 dark:border-slate-700">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j} className="whitespace-nowrap px-2 py-2 tabular-nums">{value}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </details>;
}

function Distribution({ title, note, data, darkMode, color, empty }: {
  title: string; note: string; data: { label: string; count: number }[]; darkMode?: boolean; color: string; empty: boolean;
}) {
  const tick = darkMode ? '#94a3b8' : '#64748b';
  return <section className={panel} aria-label={title}>
    <h3 className="font-bold text-green-900 dark:text-green-200">{title}</h3>
    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">{note}</p>
    {empty ? <p className="py-10 text-center text-sm text-gray-500 dark:text-slate-400">暂无可统计数据</p> : <div className="mt-3 h-52 min-w-0" role="img" aria-label={`${title}，详细数值见下方数据表`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: darkMode ? '#334155' : '#f0fdf4' }} contentStyle={{ borderRadius: 12, background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#e2e8f0' : '#334155' }} />
          <Bar dataKey="count" name="记录数（次）" fill={color} radius={[0, 5, 5, 0]} maxBarSize={20} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>}
    <DataTable headers={['分组', '次数']} rows={data.map(d => [d.label, d.count])} />
  </section>;
}

export default function PeriodStats({ records, darkMode, now }: { records: RecordEntry[]; darkMode?: boolean; now: number }) {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [anchor, setAnchor] = useState(now);
  const lastNow = useRef(now);
  // Follow a current report across midnight/month boundaries; historical views stay fixed.
  useEffect(() => {
    const previousNow = lastNow.current;
    lastNow.current = now;
    setAnchor(value => {
      const old = getPeriodRange(period, value);
      return previousNow >= old.start && previousNow < old.end && now >= old.end ? now : value;
    });
  }, [now, period]);
  const report = useMemo(() => buildPeriodReport(records, period, anchor, now), [records, period, anchor, now]);
  const unit = PERIOD_NAMES[period];
  const selectedDate = getLocalDateString(new Date(anchor));
  const today = getLocalDateString(new Date(now));
  const title = period === 'month' ? `${new Date(anchor).getFullYear()}年${new Date(anchor).getMonth() + 1}月小结`
    : period === 'day' ? `${localLabel(report.range.start)} 日总结` : `${localLabel(report.range.start)}—${localLabel(report.range.end - 1)} 周总结`;
  const tick = darkMode ? '#94a3b8' : '#64748b';
  const tooltipStyle = { borderRadius: 12, background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#e2e8f0' : '#334155' };
  const axis = { tick: { fontSize: 10, fill: tick }, axisLine: false, tickLine: false };
  const pickDate = (value: string) => {
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return;
    const date = new Date(`${value.length === 7 ? value + '-01' : value}T00:00:00`);
    if (Number.isFinite(date.getTime()) && date.getTime() <= now) setAnchor(date.getTime());
  };
  return <div className="space-y-5" aria-label="日周月总结">
    <section className={panel}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-black text-green-900 dark:text-green-200">记录总结</h2>
        <span className="text-xs text-gray-500 dark:text-slate-400">本机统计</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-green-50 p-1 dark:bg-slate-800" role="group" aria-label="总结周期">
        {(['day', 'week', 'month'] as ReportPeriod[]).map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}
          className={`min-h-11 rounded-xl text-sm font-bold ${period === value ? 'bg-green-600 text-white shadow-sm' : 'text-green-800 dark:text-green-300'}`}>{PERIOD_NAMES[value]}总结</button>)}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button type="button" aria-label={`上一${unit}`} className={button} onClick={() => setAnchor(shiftPeriod(period, anchor, -1))}>‹</button>
        <label className="min-w-0 flex-1 text-xs text-gray-500 dark:text-slate-400">
          {period === 'week' ? '选择周内任意日期' : `选择${period === 'month' ? '月份' : '日期'}`}
          <input aria-label={period === 'week' ? '选择周内日期' : period === 'month' ? '选择月份' : '选择日期'} type={period === 'month' ? 'month' : 'date'} value={period === 'month' ? selectedDate.slice(0, 7) : selectedDate}
            max={period === 'month' ? today.slice(0, 7) : today} onChange={e => pickDate(e.currentTarget.value)} onInput={e => pickDate(e.currentTarget.value)}
            className="mt-1 min-h-10 w-full min-w-0 rounded-xl border border-green-100 bg-transparent px-2 text-sm text-green-900 dark:border-slate-700 dark:text-green-200" />
        </label>
        <button type="button" aria-label={`下一${unit}`} disabled={shiftPeriod(period, anchor, 1) > now} className={button} onClick={() => setAnchor(shiftPeriod(period, anchor, 1))}>›</button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-500 dark:text-slate-400">周一开始 · 按开始时间归属</span>
        <button type="button" onClick={() => setAnchor(now)} className="min-h-10 font-bold text-green-700 underline underline-offset-4 dark:text-green-300">回到本{unit}</button>
      </div>
      <h3 className="mt-3 text-lg font-bold text-green-900 dark:text-green-200" aria-live="polite">{title}</h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{report.isCurrent ? `截至${cutoffLabel(report.cutoff)}` : '完整周期'} · 手机本地时间</p>
    </section>

    <section className="grid grid-cols-2 gap-3" aria-label="周期指标">
      <div className="rounded-3xl bg-green-600 p-5 text-white">
        <p className="text-xs opacity-90">本{unit}次数</p><p className="mt-2 text-3xl font-black tabular-nums">{report.count}<span className="ml-1 text-sm font-normal">次</span></p>
        <p className="mt-2 text-xs leading-relaxed">{describeCountChange(report)}</p>
      </div>
      <div className={panel}><p className="text-xs text-gray-500 dark:text-slate-400">平均时长</p>
        <p className="mt-2 text-2xl font-black text-green-900 dark:text-green-200">{report.averageMinutes == null ? '—' : formatMinutes(report.averageMinutes)}<span className="ml-1 text-xs font-normal">分钟</span></p>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{report.durationCount ? `${report.durationCount}次有时长` : '暂无时长数据'}</p>
      </div>
      <div className={panel}><p className="text-xs text-gray-500 dark:text-slate-400">已记录总时长</p>
        <p className="mt-2 text-2xl font-black text-green-900 dark:text-green-200">{report.durationCount ? formatMinutes(report.totalMinutes) : '—'}<span className="ml-1 text-xs font-normal">分钟</span></p>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">共{report.count}次，{report.durationCount}次有时长</p>
      </div>
      <div className={panel}><p className="text-xs text-gray-500 dark:text-slate-400">平均记录间隔</p>
        <p className="mt-2 text-lg font-black text-green-900 dark:text-green-200">{report.averageIntervalMs == null ? '—' : report.averageIntervalMs === 0 ? '0分钟' : formatElapsed(report.averageIntervalMs)}</p>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{report.intervals.length}段有效间隔</p>
      </div>
    </section>

    <section className={panel} aria-label="文字总结">
      <h3 className="font-bold text-green-900 dark:text-green-200">本{unit}回顾</h3>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{describeReport(report).map(line => <p key={line}>{line}</p>)}</div>
      <div className="mt-4 border-t border-green-100 pt-3 text-xs leading-relaxed text-gray-500 dark:border-slate-800 dark:text-slate-400">
        <p>{report.isCurrent ? '同进度对比' : '完整周期对比'}：本期{report.count}次，上期{report.previousCount}次。</p>
        <p>上期范围：{localLabel(report.previousRange.start)} 至 {cutoffLabel(report.previousCutoff)}。</p>
        <p className="mt-1">以已保存记录为准；图表分组和增减仅描述习惯，不代表健康标准。未填时长不参与时长平均。</p>
      </div>
    </section>

    <section className={panel} aria-label="次数趋势">
      <h3 className="font-bold text-green-900 dark:text-green-200">次数趋势 <span className="text-xs font-normal">次</span></h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{period === 'day' ? '按小时' : '按天'}汇总，未来时段留空；点按图表可查看数值。</p>
      <div className="mt-4 h-52 min-w-0" role="img" aria-label="次数趋势柱状图，详细数据见时长趋势下方数据表">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={report.trend} margin={{ left: -25, right: 5, top: 5, bottom: 0 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="label" {...axis} minTickGap={16} /><YAxis {...axis} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload.detail ?? ''} />
            <Bar dataKey="count" name="次数" fill="#16a34a" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>

    <section className={panel} aria-label="持续时长趋势">
      <h3 className="font-bold text-green-900 dark:text-green-200">持续时长趋势 <span className="text-xs font-normal">分钟</span></h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">● 已记录总时长（绿） · ● 平均时长（紫）；无有效时长的时段留空。</p>
      {!report.durationCount ? <p className="py-12 text-center text-sm text-gray-500 dark:text-slate-400">暂无时长数据</p> : <div className="mt-4 h-52 min-w-0" role="img" aria-label="总时长和平均时长折线图，详细数值见下方数据表">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={report.trend} margin={{ left: -20, right: 10, top: 10, bottom: 0 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="label" {...axis} minTickGap={16} /><YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} formatter={value => value == null ? '未记录' : `${formatMinutes(Number(value))}分钟`} labelFormatter={(_, payload) => payload?.[0]?.payload.detail ?? ''} />
            <Line dataKey="totalMinutes" name="已记录总时长" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
            <Line dataKey="averageMinutes" name="平均时长" stroke="#8b5cf6" strokeDasharray="4 3" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>}
      <DataTable headers={['时段', '次数', '有时长次数', '总时长/分', '平均/分']} rows={report.trend.map(d => [d.label, d.count ?? '未来', d.durationCount, d.totalMinutes == null ? '—' : formatMinutes(d.totalMinutes), d.averageMinutes == null ? '—' : formatMinutes(d.averageMinutes)])} />
    </section>
    <Distribution title="发生时段分布" note="按每条记录的本地开始时间，每4小时一组，统计本周期内的次数。" data={report.timeDistribution} darkMode={darkMode} color="#16a34a" empty={!report.count} />
    <Distribution title="两次记录间隔分布" note="按开始时间计算，归入后一条记录所在周期，包含跨周期间隔。各组含下限、不含上限；1天按24小时计。" data={report.intervalDistribution} darkMode={darkMode} color="#8b5cf6" empty={!report.intervals.length} />
  </div>;
}
