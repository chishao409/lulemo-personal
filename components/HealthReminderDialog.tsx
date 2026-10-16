import React, { useEffect, useRef } from 'react';
import type { HealthReminder } from '../types';

export const HEALTH_SOURCES = [
  { label: '中山市博爱医院 · 次数与过度的判断', url: 'https://www.zsboai.com/department_szyxzxa0_ksdt/2026/DdwkqRd1.html' },
  { label: '中国医药信息查询平台 · 北大医院彭靖医师谈频率', url: 'https://www.dayi.org.cn/qa/51054' },
  { label: '中国医药信息查询平台 · 自慰与注意事项', url: 'https://www.dayi.org.cn/symptom/1151996.html' },
  { label: '好大夫在线 · 河北省中医院医师谈时长与评估', url: 'https://www.haodf.com/neirong/wenzhang/6093153447.html' },
];

export function HealthReference() {
  return <div className="space-y-3 rounded-2xl bg-green-50 p-4 text-xs leading-relaxed text-gray-600 dark:bg-slate-800 dark:text-slate-300">
    <h4 className="text-sm font-bold text-green-900 dark:text-green-200">时长和次数怎么参考</h4>
    <p><strong>次数参考：</strong>没有适用于所有人的正常次数。有国内医师科普以每周2～3次、且没有不适作为参考例子；这不是必须达到的目标，也不是统一安全上限。更应关注疼痛、疲劳、难以控制，以及是否影响睡眠和日常生活。</p>
    <p><strong>时长参考：</strong>本应用不规定必须持续几分钟。单次自慰时长不能单独判断早泄，不必为了达到某个分钟数而强行延长刺激。</p>
    <p><strong>安排与恢复：</strong>选择不挤占睡眠、工作和学习的时间。有疼痛、破皮或肿胀时先暂停。若不适持续、反复出现，或行为难以控制并影响生活，可咨询泌尿外科、男科或心理专业人员。</p>
  </div>;
}

export function HealthGuidance({ includeReference = true }: { includeReference?: boolean }) {
  return <details className="text-xs leading-relaxed text-gray-500 dark:text-slate-400">
    <summary className="cursor-pointer py-2 font-bold text-green-700 dark:text-green-400">注意事项与国内资料来源</summary>
    <div className="mt-2 space-y-3">
      {includeReference && <HealthReference />}
      <p>动作轻柔，减少摩擦，必要时使用合适的润滑剂。有疼痛、破皮或肿胀时暂停刺激。若疼痛明显或反复出现，或持续的射精问题让你困扰，可咨询医生。</p>
      <p>提醒值用于个人习惯管理，不代表医学安全上限或疾病诊断。资料核对日期：2026-10-16。</p>
      <ul className="space-y-2">{HEALTH_SOURCES.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-block py-1 underline underline-offset-2">{source.label} ↗</a></li>)}</ul>
    </div>
  </details>;
}

export default function HealthReminderDialog({ reminders, onClose }: { reminders: HealthReminder[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const panel = dialogRef.current as HTMLElement;
      const controls = Array.from(panel.querySelectorAll<HTMLElement>('button, a[href], summary, [tabindex="0"]'))
        .filter((control) => control.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [onClose]);
  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm" onClick={onClose}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="health-reminder-title" className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-green-100 bg-white p-6 shadow-xl outline-none dark:border-slate-700 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
      <p className="text-xs font-bold text-green-700 dark:text-green-400">记录已保存</p>
      <h2 id="health-reminder-title" className="mb-5 mt-1 text-xl font-bold text-gray-900 dark:text-white">个人提醒</h2>
      <div className="space-y-3">{reminders.map((reminder) => <div key={reminder.kind} className="rounded-2xl bg-green-50 p-4 dark:bg-slate-800">
        <h3 className="text-sm font-bold text-green-900 dark:text-green-200">{reminder.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{reminder.message}</p>
      </div>)}</div>
      <div className="mt-4"><HealthGuidance /></div>
      <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-green-600 py-3 font-bold text-white">知道了</button>
    </section>
  </div>;
}
