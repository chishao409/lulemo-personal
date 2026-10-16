import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RecordEntry, RecordEntryDraft } from '../types';
import FaIcon from './FaIcon';
import { getDetailPaneSurfaceClass, getDetailSheetSurfaceClass, getDetailViewportBaseClass } from '../utils/detailModalSurface';

interface Props {
  date: string;
  records: RecordEntry[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAdd: (draft: RecordEntryDraft) => boolean;
  darkMode?: boolean;
  initialAddMode?: boolean;
}

const MOOD_OPTIONS = [
  { label: '开心', emoji: '😊' },
  { label: '放松', emoji: '😌' },
  { label: '疲惫', emoji: '😫' },
  { label: '兴奋', emoji: '😍' },
  { label: '平静', emoji: '😐' },
  { label: '空虚', emoji: '🌫️' },
];

const DURATION_OPTIONS = [5, 10, 20, 30, 45, 60];
const MOVIE_CATEGORY_OPTIONS = ['日韩', '欧美', '国产', '动漫', '其他', '自定义'] as const;
const DETAIL_MODAL_EXIT_MS = 220;
const DETAIL_MODAL_TOP_GAP_PX = 12;

const DetailModal: React.FC<Props> = ({ date, records, onClose, onDelete, onAdd, darkMode, initialAddMode }) => {
  const [isAdding, setIsAdding] = useState(initialAddMode || false);
  const [selectedMood, setSelectedMood] = useState('放松');
  const [note, setNote] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [watchedMovie, setWatchedMovie] = useState(false);
  const [movieCategory, setMovieCategory] = useState<(typeof MOVIE_CATEGORY_OPTIONS)[number]>('日韩');
  const [customMovieCategory, setCustomMovieCategory] = useState('');
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialAddMode) setIsAdding(true);
  }, [initialAddMode]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, DETAIL_MODAL_EXIT_MS);
  }, [isClosing, onClose]);

  const handleSave = () => {
    const parsedDuration = Number(durationInput.trim());
    const durationMinutes =
      durationInput.trim() && Number.isFinite(parsedDuration) && parsedDuration > 0
        ? Math.round(parsedDuration)
        : undefined;
    const resolvedMovieCategory = watchedMovie
      ? movieCategory === '自定义'
        ? customMovieCategory.trim() || '自定义'
        : movieCategory
      : undefined;

    const added = onAdd({
      date,
      mood: selectedMood,
      note,
      durationMinutes,
      watchedMovie,
      movieCategory: resolvedMovieCategory,
    });
    if (!added) return;

    setIsAdding(false);
    setNote('');
    setDurationInput('');
    setWatchedMovie(false);
    setMovieCategory('日韩');
    setCustomMovieCategory('');

    if (initialAddMode) {
      requestClose();
    }
  };

  const animateDelete = (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setArmedDeleteId(null);

    window.setTimeout(() => {
      onDelete(id);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (records.length === 1) {
        window.setTimeout(() => {
          requestClose();
        }, 100);
      }
    }, 300);
  };

  const formatMovieCategory = (record: RecordEntry) =>
    record.watchedMovie ? record.movieCategory || '已观看影片' : '未观看影片';

  const sheetMaxHeight = `calc(100dvh - env(safe-area-inset-top, 0px) - ${DETAIL_MODAL_TOP_GAP_PX}px)`;
  const addModeHeight = `calc(min(80dvh, 100dvh - env(safe-area-inset-top, 0px) - ${DETAIL_MODAL_TOP_GAP_PX}px))`;
  const listModeHeight = `calc(min(${records.length > 0 ? '68dvh' : '56dvh'}, 100dvh - env(safe-area-inset-top, 0px) - ${DETAIL_MODAL_TOP_GAP_PX}px))`;
  const actionBarClass =
    'relative isolate shrink-0 overflow-visible border-t border-white/70 bg-white px-6 pb-6 pt-4 dark:border-slate-800/80 dark:bg-slate-900';
  const actionBarBlendClass =
    'pointer-events-none absolute inset-x-0 -top-10 h-14 bg-gradient-to-b from-transparent via-white to-white dark:via-slate-900 dark:to-slate-900';
  const paneSurfaceClass = getDetailPaneSurfaceClass();
  const sheetSurfaceClass = getDetailSheetSurfaceClass();
  const viewportBaseClass = getDetailViewportBaseClass();
  const listViewClass = `absolute inset-0 flex flex-col ${paneSurfaceClass} transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
    isAdding ? '-translate-x-[7%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
  }`;
  const addViewClass = `absolute inset-0 flex flex-col ${paneSurfaceClass} transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
    isAdding ? 'translate-x-0 opacity-100' : 'translate-x-[10%] opacity-0 pointer-events-none'
  }`;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm ${
        isClosing ? 'detail-modal-backdrop-out' : 'detail-modal-backdrop'
      }`}
      style={{
        paddingTop: `calc(env(safe-area-inset-top, 0px) + ${DETAIL_MODAL_TOP_GAP_PX}px)`,
      }}
      onClick={requestClose}
    >
      <div className="w-full max-w-md">
        <div
          className={`relative w-full rounded-t-[3rem] border-t bg-white transition-[height,max-height] ${sheetSurfaceClass} duration-[1000ms] ease-linear dark:border-slate-800 dark:bg-slate-900 flex flex-col overflow-hidden ${
            isClosing ? 'detail-modal-sheet-out' : 'detail-modal-sheet'
          }`}
          style={{
            maxHeight: sheetMaxHeight,
            height: isAdding ? addModeHeight : listModeHeight,
          }}
          onClick={(e) => e.stopPropagation()}
        >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white dark:bg-slate-900" />
        <div className="relative flex h-full flex-col bg-white dark:bg-slate-900">
        <div className="shrink-0 border-b border-gray-100/80 bg-white px-6 pb-4 pt-4 dark:border-slate-800/80 dark:bg-slate-900">
          <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-slate-700"></div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{date}</h3>
              <div className="relative mt-1 h-5 overflow-hidden">
                <p
                  className={`absolute inset-0 text-sm text-gray-500 transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:text-slate-400 ${
                    isAdding ? '-translate-x-3 opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
                  }`}
                >
                  当日共有 {records.length} 条记录
                </p>
                <p
                  className={`absolute inset-0 text-sm text-gray-500 transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:text-slate-400 ${
                    isAdding ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0 pointer-events-none'
                  }`}
                >
                  记录此下的瞬间
                </p>
              </div>
            </div>
            <button
              onClick={isAdding && !initialAddMode ? () => setIsAdding(false) : requestClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors dark:bg-slate-800 dark:text-slate-400"
              aria-label={isAdding && !initialAddMode ? '返回记录列表' : '关闭详情弹窗'}
            >
              <span className="relative flex h-5 w-5 items-center justify-center overflow-hidden">
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isAdding && !initialAddMode ? '-translate-x-2 opacity-0' : 'translate-x-0 opacity-100'
                  }`}
                >
                  <FaIcon name="xmark" className="text-xl" />
                </span>
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isAdding && !initialAddMode ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
                  }`}
                >
                  <FaIcon name="arrow-left" className="text-xl" />
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-white dark:bg-slate-900">
          <div aria-hidden="true" className={viewportBaseClass} />
          <div className={listViewClass} aria-hidden={isAdding}>
            <div className="detail-list-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-5 pr-5">
              {records.length > 0 ? (
                [...records].sort((a, b) => b.timestamp - a.timestamp).map((record) => (
                  <div
                    key={record.id}
                    onClick={() => {
                      if (deletingIds.has(record.id)) return;
                      setArmedDeleteId((prev) => (prev === record.id ? null : record.id));
                    }}
                    className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition-all ${
                      armedDeleteId === record.id
                        ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950'
                        : 'border-green-100 bg-green-50 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/50'
                    } ${deletingIds.has(record.id) ? 'animate-delete' : ''}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-700">
                          <span className="text-xl">{MOOD_OPTIONS.find((m) => m.label === record.mood)?.emoji || '🦌'}</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800 dark:text-slate-200">
                            {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                              心情: {record.mood || '放松'}
                            </span>
                            {record.durationMinutes != null && (
                              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-slate-900/80 dark:text-slate-300">
                                {record.durationMinutes} 分钟
                              </span>
                            )}
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-slate-900/80 dark:text-slate-300">
                              {formatMovieCategory(record)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (armedDeleteId !== record.id) return;
                          animateDelete(record.id);
                        }}
                        disabled={deletingIds.has(record.id)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all disabled:opacity-50 ${
                          armedDeleteId === record.id
                            ? 'pointer-events-auto scale-100 bg-red-500 text-white'
                            : 'pointer-events-none scale-75 bg-red-50 text-red-300 opacity-0'
                        }`}
                      >
                        <FaIcon name="trash-can" className="text-sm" />
                      </button>
                    </div>
                    {armedDeleteId === record.id && (
                      <div className="mb-2 animate-in slide-in-from-top-1 fade-in text-[11px] font-bold text-red-500 duration-200 dark:text-red-300">
                        再点一次右侧删除按钮，即可删除这条记录
                      </div>
                    )}
                    {record.note && (
                      <div className="mt-1 rounded-xl bg-white/40 p-3 pl-1 text-sm italic text-gray-600 dark:bg-slate-900/40 dark:text-slate-400">
                        "{record.note}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400 dark:text-slate-600">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 opacity-50 dark:bg-slate-800">
                    <FaIcon name="calendar-day" className="text-3xl" />
                  </div>
                  <p className="text-sm font-medium">这天还没有打卡记录哦</p>
                </div>
              )}
            </div>

            <div className={actionBarClass}>
              <div className={actionBarBlendClass} />
              <button
                onClick={() => setIsAdding(true)}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-4 font-bold text-yellow-900 transition-colors hover:bg-yellow-500 dark:bg-yellow-600 dark:text-yellow-50 dark:hover:bg-yellow-700"
              >
                <FaIcon name="plus" className="transition-transform group-hover:rotate-90" />
                补录其它心情
              </button>
            </div>
          </div>

          <div className={addViewClass} aria-hidden={!isAdding}>
            <div className="detail-list-scroll flex-1 overflow-y-auto px-6 py-5 pr-5">
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-bold text-gray-600 dark:text-slate-400">心情怎么样？</label>
                  <div className="grid grid-cols-3 gap-3">
                    {MOOD_OPTIONS.map((mood) => (
                      <button
                        key={mood.label}
                        onClick={() => setSelectedMood(mood.label)}
                        className={`flex flex-col items-center rounded-2xl border-2 p-3 transition-all ${
                          selectedMood === mood.label
                            ? 'border-green-500 bg-green-50 shadow-sm dark:bg-green-900/20'
                            : 'border-transparent bg-gray-50 text-gray-400 dark:bg-slate-800'
                        }`}
                      >
                        <span className="mb-1 text-2xl">{mood.emoji}</span>
                        <span className={`text-xs font-bold ${selectedMood === mood.label ? 'text-green-700 dark:text-green-400' : ''}`}>
                          {mood.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-bold text-gray-600 dark:text-slate-400">本次时长（分钟）</label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {DURATION_OPTIONS.map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => setDurationInput(String(minutes))}
                          className={`rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all ${
                            durationInput === String(minutes)
                              ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                              : 'border-green-100 bg-white/70 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {minutes} 分钟
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={durationInput}
                      onChange={(e) => setDurationInput(e.target.value)}
                      placeholder="自定义时长，例如 25"
                      className="w-full rounded-2xl border-none bg-gray-50 p-4 text-sm text-gray-800 focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-bold text-gray-600 dark:text-slate-400">是否观看影片？</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWatchedMovie(true)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                        watchedMovie
                          ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                          : 'border-green-100 bg-white/70 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      是，已观看
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWatchedMovie(false);
                        setCustomMovieCategory('');
                      }}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                        !watchedMovie
                          ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                          : 'border-green-100 bg-white/70 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      否，没有观看
                    </button>
                  </div>
                </div>

                {watchedMovie && (
                  <div className="animate-in slide-in-from-bottom-2 fade-in space-y-3 duration-300">
                    <div>
                      <label className="mb-3 block text-sm font-bold text-gray-600 dark:text-slate-400">观看类型</label>
                      <div className="grid grid-cols-3 gap-2">
                        {MOVIE_CATEGORY_OPTIONS.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setMovieCategory(category)}
                            className={`rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all ${
                              movieCategory === category
                                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                : 'border-green-100 bg-white/70 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>

                    {movieCategory === '自定义' && (
                      <input
                        type="text"
                        value={customMovieCategory}
                        onChange={(e) => setCustomMovieCategory(e.target.value)}
                        placeholder="输入自定义类型"
                        className="w-full rounded-2xl border-none bg-gray-50 p-4 text-sm text-gray-800 focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-200"
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-3 block text-sm font-bold text-gray-600 dark:text-slate-400">🦌 后感（可选）</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="这一刻的心情感受..."
                    className="min-h-[100px] w-full resize-none rounded-2xl border-none bg-gray-50 p-4 text-sm text-gray-800 focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className={actionBarClass}>
              <div className={actionBarBlendClass} />
              <button
                onClick={handleSave}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 font-bold text-white transition-colors hover:bg-green-600"
              >
                <FaIcon name="check" />
                完成记录
              </button>
            </div>
          </div>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
