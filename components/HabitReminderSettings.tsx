import React, { useEffect, useState } from 'react';
import type { HabitSettings } from '../types';
import { validateHabitSettings } from '../utils/habits';
import { HealthGuidance, HealthReference } from './HealthReminderDialog';

export default function HabitReminderSettings({ settings, onSave }: { settings: HabitSettings; onSave: (value: HabitSettings) => Promise<string> }) {
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(settings); }, [settings]);
  const update = (value: Partial<HabitSettings>) => { setDraft((previous) => ({ ...previous, ...value })); setMessage(''); };
  const save = async () => {
    const error = validateHabitSettings(draft);
    if (error) { setMessage(error); return; }
    setSaving(true);
    try { setMessage(await onSave(draft)); } catch { setMessage('保存失败，请重试'); }
    finally { setSaving(false); }
  };
  const inputClass = 'mt-2 w-full min-w-0 rounded-xl border border-green-100 bg-white px-3 py-3 text-sm text-gray-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
  const rules = [
    { enabled: 'dailyEnabled', value: 'dailyLimit', label: '每日次数提醒', description: '达到或超过设定次数，每天提醒一次', unit: '次 / 天', step: '1' },
    { enabled: 'durationEnabled', value: 'minDurationMinutes', label: '单次时长提醒', description: '本次持续时长低于设定值时提醒', unit: '分钟', step: 'any' },
    { enabled: 'intervalEnabled', value: 'minIntervalHours', label: '两次间隔提醒', description: '两次开始时间的间隔低于设定值时提醒', unit: '小时', step: 'any' },
  ] as const;
  return <section aria-label="个人提醒设置" className="space-y-4 border-t border-green-100 pt-5 dark:border-slate-700">
    <div><h4 className="font-bold text-gray-800 dark:text-slate-200">次数、时长与健康提示</h4><p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">分别开启并填写个人提醒值。保存今天的记录时判断；历史补录、导入和删除不会弹提醒。</p></div>
    {rules.map((rule) => <div key={rule.enabled} className="rounded-2xl bg-green-50/70 p-4 dark:bg-slate-800/50">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span><span className="block text-sm font-bold text-gray-800 dark:text-slate-200">{rule.label}</span><span className="mt-1 block text-xs text-gray-500 dark:text-slate-400">{rule.description}</span></span>
        <input type="checkbox" checked={draft[rule.enabled]} onChange={(event) => update({ [rule.enabled]: event.target.checked })} className="h-5 w-5 shrink-0 accent-green-600" />
      </label>
      {draft[rule.enabled] && <label className="mt-3 block text-xs text-gray-600 dark:text-slate-300">提醒值（{rule.unit}）
        <input aria-label={`${rule.label}阈值`} type="number" inputMode={rule.step === '1' ? 'numeric' : 'decimal'} min={rule.step === '1' ? '1' : '0.001'} step={rule.step} value={draft[rule.value] ?? ''} onChange={(event) => update({ [rule.value]: event.target.value === '' ? null : Number(event.target.value) })} placeholder="由你设置" className={inputClass} />
      </label>}
    </div>)}
    <label className="block text-xs font-bold text-gray-600 dark:text-slate-300">次数提醒文案
      <input type="text" maxLength={100} value={draft.reminderText} onChange={(event) => update({ reminderText: event.target.value })} className={inputClass} placeholder="已达到今日设定次数" />
    </label>
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold text-gray-800 dark:text-slate-200">
      <span>同时显示手机通知<span className="mt-1 block text-xs font-normal text-gray-500 dark:text-slate-400">通知仅显示中性摘要；首次开启需要系统授权。</span></span>
      <input type="checkbox" checked={draft.notificationsEnabled} onChange={(event) => update({ notificationsEnabled: event.target.checked })} className="h-5 w-5 shrink-0 accent-green-600" />
    </label>
    <button type="button" disabled={saving} onClick={() => void save()} className="w-full rounded-2xl bg-green-600 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? '正在保存…' : '保存提醒设置'}</button>
    {message && <p role="status" className="text-xs leading-relaxed text-green-800 dark:text-green-300">{message}</p>}
    <HealthReference />
    <HealthGuidance includeReference={false} />
  </section>;
}
