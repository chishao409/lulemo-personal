import React, { useState } from 'react';
import type { RecordEntry, SessionTimer } from '../types';
import { formatElapsed, getHabitSummary } from '../utils/habits';

interface Props {
  records: RecordEntry[];
  now: number;
  timer: SessionTimer | null;
  onStart: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onAdd: () => void;
  onSettings: () => void;
}

export default function HabitDashboard({ records, now, timer, onStart, onFinish, onCancel, onAdd, onSettings }: Props) {
  const summary = getHabitSummary(records, now);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const elapsed = timer ? Math.max(0, (timer.stoppedAt ?? now) - timer.startedAt) : 0;
  const totalSeconds = Math.floor(elapsed / 1000);
  const timerLabel = `${String(Math.floor(totalSeconds / 3600)).padStart(2, '0')}:${String(Math.floor(totalSeconds / 60) % 60).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  return (
    <section aria-label="坚持与计时" className="m-4 mb-0 rounded-[2rem] border border-green-100 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-green-700 dark:text-green-400">当前坚持</span>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300">今日 {summary.todayCount} 次</span>
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-green-900 dark:text-green-200" data-testid="current-streak">
        {summary.currentMs == null ? '暂无记录' : `已坚持${formatElapsed(summary.currentMs)}`}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
        {summary.latest ? `距上次记录 · ${new Date(summary.latest.timestamp).toLocaleString('zh-CN', { hour12: false })}` : '保存第一条记录后，开始计算间隔。'}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-green-100 pt-3 text-xs dark:border-slate-800">
        <span className="text-gray-500 dark:text-slate-400">历史最长坚持</span>
        <strong className="text-green-800 dark:text-green-300" data-testid="best-streak">{summary.bestMs == null ? '暂无记录' : formatElapsed(summary.bestMs)}</strong>
        {summary.isNewBest && <span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">新纪录</span>}
      </div>
      <p className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">每满24小时计1天，依据已保存的记录计算。</p>

      <div className="mt-4 rounded-2xl bg-green-50 p-4 dark:bg-slate-800">
        {timer ? <>
          <div className="flex items-center justify-between text-xs text-green-700 dark:text-green-300">
            <span>{timer.stoppedAt != null ? '计时已结束 · 待确认' : '正在计时'}</span>
            <span>{timer.stoppedAt != null ? '时长已固定，可修改' : '切后台、锁屏后继续'}</span>
          </div>
          <div role="timer" className="my-3 font-mono text-3xl font-bold tabular-nums text-green-900 dark:text-green-100">{timerLabel}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onFinish} className="flex-1 rounded-xl bg-green-600 px-3 py-3 text-sm font-bold text-white">{timer.stoppedAt != null ? '确认记录' : '结束并确认'}</button>
            <button type="button" onClick={() => setConfirmCancel(true)} className="rounded-xl bg-white px-3 py-3 text-sm text-gray-600 dark:bg-slate-700 dark:text-slate-200">取消计时</button>
          </div>
          {confirmCancel && <div className="mt-3 space-y-2 text-xs text-gray-600 dark:text-slate-300">
            <p>取消本次计时？不会生成记录。</p>
            <div className="flex gap-4">
              <button type="button" onClick={() => { onCancel(); setConfirmCancel(false); }} className="py-2 font-bold text-red-600 dark:text-red-300">确认取消</button>
              <button type="button" onClick={() => setConfirmCancel(false)} className="py-2">保留计时</button>
            </div>
          </div>}
        </> : <div className="flex gap-2">
          <button type="button" onClick={onStart} className="flex-1 rounded-xl bg-green-600 px-3 py-3 text-sm font-bold text-white">开始计时</button>
          <button type="button" onClick={onAdd} className="flex-1 rounded-xl border border-green-200 bg-white px-3 py-3 text-sm font-bold text-green-800 dark:border-slate-600 dark:bg-slate-700 dark:text-green-200">手动记录</button>
        </div>}
      </div>
      <button type="button" onClick={onSettings} className="mt-4 min-h-9 text-xs font-bold text-green-700 underline underline-offset-4 dark:text-green-400">设置次数、时长与间隔提醒</button>
    </section>
  );
}
