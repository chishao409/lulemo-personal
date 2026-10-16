import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RecordEntry } from '../types';
import { getLocalDateString } from '../constants';
import FaIcon from './FaIcon';

interface Props {
  records: RecordEntry[];
  onDateClick: (date: string) => void;
  stampAnimationDate: string | null;
  darkMode: boolean;
  onDatePickerOpenChange?: (open: boolean) => void;
  requestDatePickerCloseToken?: number;
}

const CalendarView: React.FC<Props> = ({ records, onDateClick, stampAnimationDate, darkMode, onDatePickerOpenChange, requestDatePickerCloseToken }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const setDatePickerOpen = (open: boolean) => {
    setShowDatePicker(open);
    onDatePickerOpenChange?.(open);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  
  const jumpToDate = () => {
    setViewDate(new Date(selectedYear, selectedMonth - 1, 1));
    setDatePickerOpen(false);
  };
  
  const openDatePicker = () => {
    setSelectedYear(year);
    setSelectedMonth(month + 1);
    setShowYearPicker(false);
    setShowMonthPicker(false);
    setDatePickerOpen(true);
  };

  useEffect(() => {
    if (!requestDatePickerCloseToken) return;
    setShowYearPicker(false);
    setShowMonthPicker(false);
    setDatePickerOpen(false);
  }, [requestDatePickerCloseToken]);

  const days = [];
  // Padding for start of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 border-t border-l border-green-50/50 dark:border-slate-800/50"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayRecords = records.filter(r => getLocalDateString(new Date(r.timestamp)) === dateStr);
    const count = dayRecords.length;
    const isToday = getLocalDateString() === dateStr;
    const isAnimating = stampAnimationDate === dateStr;
    const hasRecords = count > 0;

    days.push(
      <button
        key={dateStr}
        onClick={() => onDateClick(dateStr)}
        className={`h-24 border-t border-l border-green-50/50 dark:border-slate-800/50 relative flex flex-col items-center justify-between py-2 overflow-hidden hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-300 ${
          isToday ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''
        } ${hasRecords ? 'hover:scale-[1.02] active:scale-[0.98]' : ''} ${showDatePicker ? 'pointer-events-none' : ''}`}
      >
        <span className={`text-xs font-bold leading-none ${isToday ? 'text-green-800 dark:text-green-400 underline decoration-2 underline-offset-4' : 'text-gray-400 dark:text-slate-500'}`}>
          {d}
        </span>
        
        <div className="flex-1 flex flex-col items-center justify-center w-full relative">
          {hasRecords && (
            <div className={`flex flex-col items-center justify-center min-h-[40px] transition-all duration-500 ${hasRecords ? 'drop-shadow-[0_0_8px_rgba(76,175,80,0.3)] dark:drop-shadow-[0_0_8px_rgba(74,222,128,0.2)]' : ''}`}>
              <div className="relative flex items-center justify-center">
                <span className={`text-2xl leading-none block transform-gpu ${isAnimating ? 'animate-stamp' : ''}`} style={{ willChange: 'transform' }}>
                  🦌
                </span>
              </div>
              
              {count > 1 && (
                <div className={`mt-0.5 handwriting text-red-500 dark:text-red-400 text-sm font-black transform -rotate-6 select-none ${isAnimating ? 'animate-counter-pop' : ''}`}>
                  x{count}
                </div>
              )}

              {isAnimating && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
                  <div className="animate-particle absolute w-1 h-1 bg-green-400 rounded-full" style={{ '--tw-translate-x': '-15px', '--tw-translate-y': '-15px' } as any}></div>
                  <div className="animate-particle absolute w-1 h-1 bg-green-300 rounded-full" style={{ '--tw-translate-x': '15px', '--tw-translate-y': '-15px' } as any}></div>
                  <div className="animate-particle absolute w-1.5 h-1.5 bg-yellow-400 rounded-full" style={{ '--tw-translate-x': '0px', '--tw-translate-y': '-20px' } as any}></div>
                  <div className="animate-particle absolute w-1 h-1 bg-green-500 rounded-full" style={{ '--tw-translate-x': '-12px', '--tw-translate-y': '5px' } as any}></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Subtle indicator dot if record exists */}
        <div className={`h-1 w-1 rounded-full transition-all duration-500 ${hasRecords ? 'bg-green-500/40' : 'opacity-0'}`}></div>

        </button>
          );
        }

  const trailingEmptyDays = (7 - (days.length % 7)) % 7;
  for (let i = 0; i < trailingEmptyDays; i++) {
    days.push(
      <div
        key={`empty-end-${i}`}
        className="h-24 border-t border-l border-green-50/50 dark:border-slate-800/50"
      ></div>
    );
  }

        return (
          <div className={`bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm m-4 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden mb-32`}>
      
      <div className="flex justify-between items-center p-5 bg-green-50/50 dark:bg-slate-800/50 border-b border-green-100 dark:border-slate-800">
        <button 
          onClick={openDatePicker}
          className="text-lg font-bold text-green-800 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 transition-all duration-300 flex items-center gap-2 group active:scale-95"
        >
          <span className="group-hover:scale-105 transition-transform duration-300">{year}年 {month + 1}月</span>
          <FaIcon name="calendar-day" className="text-sm group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
        </button>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full text-green-700 dark:text-green-500 hover:bg-green-100 dark:hover:bg-slate-800 transition-colors">
            <FaIcon name="chevron-left" className="text-sm" />
          </button>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full text-green-700 dark:text-green-500 hover:bg-green-100 dark:hover:bg-slate-800 transition-colors">
            <FaIcon name="chevron-right" className="text-sm" />
          </button>
        </div>
      </div>
      
      <div className="calendar-grid bg-white/40 dark:bg-slate-900/40">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="text-center py-3 text-[10px] font-black text-green-700/40 dark:text-green-400/30 uppercase border-l first:border-l-0 border-green-50/50 dark:border-slate-800/50">
            {day}
          </div>
        ))}
        {days}
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && typeof document !== 'undefined' && createPortal(
        <div 
          className={`${darkMode ? 'dark ' : ''}fixed inset-0 z-[100] isolate pointer-events-auto flex items-center justify-center p-6`}
          onClick={() => { setDatePickerOpen(false); }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div 
            className="calendar-date-picker-sheet w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-green-100 dark:border-slate-800 absolute left-1/2"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <span 
                className="calendar-picker-icon text-5xl block mb-4 inline-block"
              >
                📅
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>选择日期</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>跳转到指定月份</p>
            </div>
            
            <div className="relative z-40 flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              {/* 年份选择 */}
              <div className="flex-1 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowYearPicker(!showYearPicker);
                    setShowMonthPicker(false);
                  }}
                  className="w-full p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-2xl text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-gray-800 dark:text-white transition-all duration-300 hover:border-green-300 dark:hover:border-green-600 cursor-pointer flex items-center justify-center gap-2"
                >
                  {selectedYear}年
                  <FaIcon name="chevron-down" className={`text-green-500 text-sm transition-transform duration-300 ${showYearPicker ? 'rotate-180' : ''}`} />
                </button>
                {showYearPicker && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-green-200 dark:border-slate-700 max-h-60 overflow-y-auto z-[70] animate-in slide-in-from-top-2 duration-200">
                    {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 10 + i).map((y) => (
                      <button
                        key={y}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedYear(y);
                          setShowYearPicker(false);
                        }}
                        className={`w-full p-3 text-center font-bold transition-all duration-200 hover:bg-green-50 dark:hover:bg-slate-800 ${
                          y === selectedYear 
                            ? 'bg-green-100 dark:bg-slate-800 text-green-600 dark:text-green-400' 
                            : 'text-gray-700 dark:text-slate-300'
                        } first:rounded-t-2xl last:rounded-b-2xl`}
                      >
                        {y}年
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 月份选择 */}
              <div className="flex-1 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMonthPicker(!showMonthPicker);
                    setShowYearPicker(false);
                  }}
                  className="w-full p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-2xl text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-gray-800 dark:text-white transition-all duration-300 hover:border-green-300 dark:hover:border-green-600 cursor-pointer flex items-center justify-center gap-2"
                >
                  {selectedMonth}月
                  <FaIcon name="chevron-down" className={`text-green-500 text-sm transition-transform duration-300 ${showMonthPicker ? 'rotate-180' : ''}`} />
                </button>
                {showMonthPicker && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-green-200 dark:border-slate-700 max-h-60 overflow-y-auto z-[70] animate-in slide-in-from-top-2 duration-200">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <button
                        key={m}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMonth(m);
                          setShowMonthPicker(false);
                        }}
                        className={`w-full p-3 text-center font-bold transition-all duration-200 hover:bg-green-50 dark:hover:bg-slate-800 ${
                          m === selectedMonth 
                            ? 'bg-green-100 dark:bg-slate-800 text-green-600 dark:text-green-400' 
                            : 'text-gray-700 dark:text-slate-300'
                        } first:rounded-t-2xl last:rounded-b-2xl`}
                      >
                        {m}月
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="relative z-10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
              <button 
                onClick={jumpToDate}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 transition-all duration-300 active:scale-95 hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/40 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <FaIcon name="check" className="text-sm group-hover:scale-110 transition-transform duration-300" />
                  确定
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}></div>
              </button>
              <button 
                onClick={() => {
                  setViewDate(new Date());
                  setDatePickerOpen(false);
                }}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all duration-300 active:scale-95 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <FaIcon name="home" className="text-sm group-hover:scale-110 transition-transform duration-300" />
                  回到今天
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}></div>
              </button>
              <button 
                onClick={() => { setDatePickerOpen(false); }}
                className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-2xl transition-all duration-300 active:scale-95 hover:scale-[1.02] hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                取消
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CalendarView;
