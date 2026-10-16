import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RecordEntry } from '../types';
import { getLocalDateString } from '../constants';
import FaIcon from './FaIcon';

interface Props {
  records: RecordEntry[];
  darkMode?: boolean;
}

/** 热力图单格：按当日打卡次数分 0/1/2/3/4/5+ 六档颜色，便于区分 */
function getHeatColor(level: number, darkMode: boolean): string {
  if (level === 0) return darkMode ? 'rgba(51,65,85,0.25)' : 'rgba(229,231,235,0.7)';
  if (level === 1) return darkMode ? 'rgba(74,222,128,0.35)' : 'rgba(187,247,208,0.95)';
  if (level === 2) return darkMode ? 'rgba(74,222,128,0.55)' : 'rgba(134,239,172,0.95)';
  if (level === 3) return darkMode ? 'rgba(74,222,128,0.75)' : 'rgba(74,222,128,0.9)';
  if (level === 4) return darkMode ? 'rgba(34,197,94,0.9)' : 'rgba(34,197,94,0.85)';
  return darkMode ? 'rgb(22,163,74)' : 'rgb(22,163,74)';
}

type HeatmapMode = 'year' | 'month';

const StatsView: React.FC<Props> = ({ records, darkMode }) => {
  const [heatTooltip, setHeatTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('year');
  const now = new Date();
  const [heatmapViewYear, setHeatmapViewYear] = useState(now.getFullYear());
  const [heatmapViewMonth, setHeatmapViewMonth] = useState(now.getMonth());

  const statsData = useMemo(() => {
    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    const currentYear = new Date().getFullYear();
    
    return months.map((m, index) => {
      const count = records.filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      }).length;
      return { name: m, count };
    });
  }, [records]);

  const currentYear = new Date().getFullYear();

  /** 全量按日聚合，供年/月视图共用 */
  const heatmapDataAll = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      const key = getLocalDateString(new Date(r.timestamp));
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [records]);

  const heatmapRows = useMemo(() => {
    const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
    const rows: { month: number; cells: { day: number; count: number; level: number; isValid: boolean; label: string }[] }[] = [];
    for (let month = 0; month < 12; month++) {
      const maxDay = daysInMonth(currentYear, month + 1);
      const cells: { day: number; count: number; level: number; isValid: boolean; label: string }[] = [];
      for (let day = 1; day <= 31; day++) {
        const isValid = day <= maxDay;
        const dateStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const count = isValid ? heatmapDataAll.get(dateStr) ?? 0 : 0;
        const level = count <= 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : count === 4 ? 4 : 5;
        cells.push({
          day,
          count,
          level,
          isValid,
          label: isValid ? `${month + 1}月${day}日` : '',
        });
      }
      rows.push({ month, cells });
    }
    return rows;
  }, [heatmapDataAll, currentYear]);

  /** 月度热力图：日历格 7 列（日～六），按当月日期排布 */
  const heatmapMonthGrid = useMemo(() => {
    const year = heatmapViewYear;
    const month = heatmapViewMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; count: number; level: number; label: string }[] = [];
    const leadingEmpty = firstDay;
    for (let i = 0; i < leadingEmpty; i++) {
      cells.push({ day: null, count: 0, level: 0, label: '' });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const count = heatmapDataAll.get(dateStr) ?? 0;
      const level = count <= 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : count === 4 ? 4 : 5;
      cells.push({
        day,
        count,
        level,
        label: `${month + 1}月${day}日`,
      });
    }
    return { cells, daysInMonth };
  }, [heatmapDataAll, heatmapViewYear, heatmapViewMonth]);

  const totalCount = records.length;
  const avgMonthly = (totalCount / 12).toFixed(1);

  const quotes = [
    "保持节奏，🦌加油！", 
    "身心愉悦，适度最美。", 
    "鹿鹿大吉，今天也是元气满满！", 
    "听从身体的声音。",
    "健康生活，从了解自己开始。",
    "每一次记录，都是爱自己的证明。",
    "温柔对待自己，你值得被宠爱。",
    "身体是最诚实的朋友。",
    "规律作息，自然舒适。",
    "与自己和解，与身体对话。",
    "慢慢来，比较快。",
    "自律即自由，记录即成长。",
    "倾听内心，尊重感受。",
    "今天也要好好爱自己哦～",
    "每个阶段都有独特的美。",
    "悦纳自己，从记录开始。",
    "你已经做得很好了！",
    "健康的节奏，幸福的生活。",
    "温柔坚定，自在前行。",
    "记录点滴，收获成长。"
  ];
  // 使用 useMemo 缓存“一言”文本，避免拖动时频繁重新渲染导致内容跳动
  const encouragement = useMemo(() => {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  const tickColor = darkMode ? '#94a3b8' : '#6B7280';
  const gridColor = darkMode ? '#1e293b' : '#E5E7EB';
  const barColor = darkMode ? '#4ade80' : '#4CAF50';
  const barBgColor = darkMode ? '#334155' : '#E5E7EB';

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-green-100 dark:border-slate-800">
        <h3 className="text-xl font-bold text-green-800 dark:text-green-400 mb-4 flex items-center gap-2">
          <FaIcon name="chart-line" /> 年度趋势 ({new Date().getFullYear()})
        </h3>
        {/* 修复：外层包裹 div 设置 overflow hidden 和最小高度，帮助 Recharts 正确计算尺寸 */}
        <div className="h-64 w-full min-w-0 overflow-hidden" style={{ minHeight: '256px' }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={statsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis 
                dataKey="name" 
                tick={{fontSize: 10, fill: tickColor}} 
                axisLine={false} 
                tickLine={false} 
                interval={0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: tickColor}} 
              />
              <Tooltip 
                cursor={{fill: darkMode ? '#1e293b' : '#F3F4F6'}}
                contentStyle={{
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                  color: darkMode ? '#f1f5f9' : '#1f2937'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.count > 0 ? barColor : barBgColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-600 dark:bg-green-700 p-6 rounded-3xl text-white shadow-md">
          <div className="text-xs opacity-80 mb-1">年度累计</div>
          <div className="text-3xl font-black">{totalCount}</div>
          <div className="text-[10px] mt-1 font-bold">次</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-green-100 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">月平均</div>
          <div className="text-3xl font-black text-green-800 dark:text-green-400">{avgMonthly}</div>
          <div className="text-[10px] text-green-600 dark:text-green-500 font-bold mt-1">次/月</div>
        </div>
      </div>

      {/* 打卡热力图：按年 / 按月 切换 */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-green-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-xl font-bold text-green-800 dark:text-green-400 flex items-center gap-2">
            <FaIcon name="fire" />
            {heatmapMode === 'year' ? `打卡热力图 (${currentYear})` : `${heatmapViewYear}年${heatmapViewMonth + 1}月 热力图`}
          </h3>
          <div className="flex items-center gap-2">
            {heatmapMode === 'month' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (heatmapViewMonth === 0) {
                      setHeatmapViewYear((y) => y - 1);
                      setHeatmapViewMonth(11);
                    } else {
                      setHeatmapViewMonth((m) => m - 1);
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 dark:bg-slate-800 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="上一月"
                >
                  <FaIcon name="chevron-left" className="text-sm" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (heatmapViewMonth === 11) {
                      setHeatmapViewYear((y) => y + 1);
                      setHeatmapViewMonth(0);
                    } else {
                      setHeatmapViewMonth((m) => m + 1);
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 dark:bg-slate-800 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="下一月"
                >
                  <FaIcon name="chevron-right" className="text-sm" />
                </button>
              </>
            )}
            <div className="flex rounded-xl overflow-hidden border border-green-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setHeatmapMode('year')}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${heatmapMode === 'year' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
              >
                按年
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMode('month')}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${heatmapMode === 'month' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
              >
                按月
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
          {heatmapMode === 'year' ? '每行为一月，每格为当日；颜色越深表示打卡次数越多' : '每格为一天，颜色越深表示当日打卡次数越多'}
        </p>

        {heatmapMode === 'year' ? (
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-[2px] mb-3">
              {heatmapRows.map((row) => (
                <div key={row.month} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 w-6 shrink-0">{row.month + 1}月</span>
                  <div className="flex gap-[2px]">
                    {row.cells.map((cell) => (
                      <div
                        key={cell.day}
                        className="rounded-[2px] w-2 h-2 min-w-[8px] min-h-[8px] shrink-0"
                        style={{
                          backgroundColor: getHeatColor(cell.level, !!darkMode),
                          opacity: cell.isValid ? 1 : 0.25,
                        }}
                        title={cell.isValid ? (cell.count > 0 ? `${cell.label}: ${cell.count} 次` : `${cell.label}: 未打卡`) : undefined}
                        onMouseEnter={(e) => {
                          if (!cell.isValid) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHeatTooltip({
                            text: cell.count > 0 ? `${cell.label}: ${cell.count} 次` : `${cell.label}: 未打卡`,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHeatTooltip(null)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map((weekday) => (
                <div
                  key={weekday}
                  className="text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 py-1"
                >
                  {weekday}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1" style={{ gridAutoRows: 'minmax(36px, 1fr)' }}>
              {heatmapMonthGrid.cells.map((cell, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg flex items-center justify-center text-sm font-bold min-h-[36px] ${
                    cell.day == null
                      ? 'bg-transparent'
                      : 'cursor-default'
                  } ${cell.level > 0 ? 'text-white' : darkMode ? 'text-slate-300' : 'text-gray-600'}`}
                  style={
                    cell.day == null
                      ? {}
                      : {
                          backgroundColor: getHeatColor(cell.level, !!darkMode),
                        }
                  }
                  title={cell.label ? (cell.count > 0 ? `${cell.label}: ${cell.count} 次` : `${cell.label}: 未打卡`) : undefined}
                  onMouseEnter={(e) => {
                    if (!cell.label) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHeatTooltip({
                      text: cell.count > 0 ? `${cell.label}: ${cell.count} 次` : `${cell.label}: 未打卡`,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHeatTooltip(null)}
                >
                  {cell.day ?? ''}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-green-100 dark:border-slate-800">
          <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 mb-2">图例（当日打卡次数）</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {[
              { level: 0, label: '0 次' },
              { level: 1, label: '1 次' },
              { level: 2, label: '2 次' },
              { level: 3, label: '3 次' },
              { level: 4, label: '4 次' },
              { level: 5, label: '5+ 次' },
            ].map(({ level, label }) => (
              <div key={level} className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded-[3px] shrink-0 border border-gray-200 dark:border-slate-600"
                  style={{ backgroundColor: getHeatColor(level, !!darkMode) }}
                />
                <span className="text-[10px] text-gray-600 dark:text-slate-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
        {heatTooltip && (
          <div
            className="fixed z-[100] px-2 py-1 rounded-lg text-xs font-medium bg-gray-800 dark:bg-slate-700 text-white shadow-lg pointer-events-none"
            style={{ left: heatTooltip.x, top: heatTooltip.y, transform: 'translate(-50%, -100%) translateY(-6px)' }}
          >
            {heatTooltip.text}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 p-6 rounded-3xl text-center">
        <span className="text-4xl block mb-2">🦌</span>
        <p className="text-yellow-900 dark:text-yellow-400 font-bold">{encouragement}</p>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-gray-600 dark:text-slate-400 font-bold px-2">每月明细</h4>
        {statsData.filter(d => d.count > 0).reverse().map((m) => (
          <div key={m.name} className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl flex justify-between items-center border border-white/40 dark:border-slate-800">
            <span className="font-bold text-gray-700 dark:text-slate-300">{m.name}</span>
            <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold">{m.count} 次</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsView;
