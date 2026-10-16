import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ViewType, RecordEntry, RecordEntryDraft, CustomBackgroundConfig, WebDavBackupFile, WebDavConfig } from './types';
import {
  STORAGE_KEY,
  PIN_KEY,
  THEME_KEY,
  THEME_MODE_KEY,
  ICON_KEY,
  SOUND_KEY,
  CUSTOM_SOUND_KEY,
  AGE_VERIFIED_KEY,
  LONG_PRESS_THRESHOLD,
  LAST_EXPORT_FILE_KEY,
  LAST_EXPORT_FILENAME_KEY,
  SECURITY_QUESTION_KEY,
  SECURITY_ANSWER_KEY,
  PIN_FAILED_ATTEMPTS_KEY,
  PIN_LOCK_UNTIL_KEY,
  CUSTOM_BACKGROUND_KEY,
  WEBDAV_CONFIG_KEY,
  SAGE_MODE_DURATION_KEY,
  SAGE_MODE_COOLDOWN_END_KEY,
  SAGE_MODE_ENABLED_KEY,
  BIOMETRIC_UNLOCK_ENABLED_KEY,
  DEFAULT_SAGE_MODE_DURATION_MINUTES,
  getLocalDateString,
} from './constants';
import CalendarView from './components/CalendarView';
import SplashScreen from './components/SplashScreen';
import DetailModal from './components/DetailModal';
import LockScreen from './components/LockScreen';
import ChangeLog from './components/ChangeLog';
import FaIcon from './components/FaIcon';
import { App as CapacitorApp } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { mergeImportedRecords, parseRecordEntriesFromCsv, serializeRecordsToCsv } from './utils/csv';
import { migrateStorageKeys } from './utils/storageMigration';
import { APP_STORAGE_KEYS, LEGACY_STORAGE_KEY_PAIRS, PIN_SECURITY_STORAGE_KEYS, removeStorageKeys } from './utils/appStorage';
import { clearScheduledTimeout, scheduleReplacingTimeout } from './utils/timers';
import { parseStoredThemeMode, resolveDarkMode, ThemeMode } from './utils/theme';
import { buildBackgroundImageStyle, parseStoredBackgroundConfig, serializeBackgroundConfig } from './utils/background';
import { clearNativeTextSelection, getSwipeLockGraceUntil, shouldBlockSwipeInteraction, SWIPE_LOCK_GRACE_MS } from './utils/swipe';
import {
  downloadWebDavBackup,
  getLatestWebDavBackup,
  listWebDavBackups,
  normalizeWebDavConfig,
  parseStoredWebDavConfig,
  serializeWebDavConfig,
  testWebDavConnection,
  uploadWebDavBackup,
} from './utils/webdav';

type StatsViewModule = typeof import('./components/StatsView');
let statsViewLoadPromise: Promise<StatsViewModule> | null = null;
const loadStatsView = () => {
  if (!statsViewLoadPromise) {
    statsViewLoadPromise = import('./components/StatsView');
  }
  return statsViewLoadPromise;
};
const LazyStatsView = React.lazy(loadStatsView);
type SettingsViewModule = typeof import('./components/SettingsView');
let settingsViewLoadPromise: Promise<SettingsViewModule> | null = null;
const loadSettingsView = () => {
  if (!settingsViewLoadPromise) {
    settingsViewLoadPromise = import('./components/SettingsView');
  }
  return settingsViewLoadPromise;
};
const LazySettingsView = React.lazy(loadSettingsView);

function migrateLegacyStorageKeys(): void {
  try {
    migrateStorageKeys(localStorage, LEGACY_STORAGE_KEY_PAIRS);
  } catch (e) {
    console.warn('Legacy key migration skipped:', e);
  }
}

migrateLegacyStorageKeys();

const StatsViewFallback: React.FC = () => (
  <div className="p-4 pb-20 space-y-4 animate-pulse">
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-[2rem] border border-green-100 dark:border-slate-800 p-5">
      <div className="h-5 w-28 rounded bg-green-100 dark:bg-slate-800" />
      <div className="mt-4 h-28 rounded-2xl bg-green-50 dark:bg-slate-800/60" />
    </div>
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-[2rem] border border-green-100 dark:border-slate-800 p-5">
      <div className="h-5 w-24 rounded bg-green-100 dark:bg-slate-800" />
      <div className="mt-4 h-40 rounded-2xl bg-green-50 dark:bg-slate-800/60" />
    </div>
    <div className="text-center text-xs font-bold text-green-700/80 dark:text-green-300/80">
      正在准备统计视图...
    </div>
  </div>
);

const SettingsViewFallback: React.FC = () => (
  <div className="p-4 pb-20 space-y-4 animate-pulse">
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-[2rem] border border-green-100 dark:border-slate-800 p-5">
      <div className="h-5 w-24 rounded bg-green-100 dark:bg-slate-800" />
      <div className="mt-4 h-9 rounded-xl bg-green-50 dark:bg-slate-800/60" />
      <div className="mt-3 h-9 rounded-xl bg-green-50 dark:bg-slate-800/60" />
    </div>
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-[2rem] border border-green-100 dark:border-slate-800 p-5">
      <div className="h-5 w-28 rounded bg-green-100 dark:bg-slate-800" />
      <div className="mt-4 h-24 rounded-2xl bg-green-50 dark:bg-slate-800/60" />
    </div>
    <div className="text-center text-xs font-bold text-green-700/80 dark:text-green-300/80">
      正在准备设置视图...
    </div>
  </div>
);

type ToastDisplay =
  | { kind: 'default'; message: string }
  | { kind: 'export-saved'; title: string; path?: string; filename?: string };

interface DataDialogProps {
  children: (controls: { isClosing: boolean; requestClose: (afterClose?: () => void) => void }) => React.ReactNode;
  onClose: () => void;
}

function parseToastDisplay(message: string): ToastDisplay {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const normalizedTitle = lines[0]?.replace(/^✨\s*/, '');
  const path = lines.find((line) => line.includes('Documents/') || line.includes('Cache/'))?.replace(/^📁\s*/, '');
  const filename = lines.find((line) => line.endsWith('.csv'))?.replace(/^📄\s*/, '');

  if (normalizedTitle === '已保存' && (path || filename)) {
    return {
      kind: 'export-saved',
      title: normalizedTitle,
      path,
      filename,
    };
  }

  return { kind: 'default', message };
}

const DATA_DIALOG_EXIT_MS = 220;

const DataDialog: React.FC<DataDialogProps> = ({ children, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const requestClose = useCallback(
    (afterClose?: () => void) => {
      if (isClosing) return;
      setIsClosing(true);
      closeTimerRef.current = window.setTimeout(() => {
        afterClose?.();
        onClose();
      }, DATA_DIALOG_EXIT_MS);
    },
    [isClosing, onClose]
  );

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-6 ${
        isClosing ? 'data-dialog-backdrop-out' : 'data-dialog-backdrop'
      }`}
      onClick={() => requestClose()}
    >
      {children({ isClosing, requestClose })}
    </div>
  );
};

const App: React.FC = () => {
  // 直接从 localStorage 初始化，避免闪屏
  const isAgeVerifiedOnLoad = localStorage.getItem(AGE_VERIFIED_KEY) === 'true';
  const getSystemPrefersDark = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;

  const [showSplash, setShowSplash] = useState(!isAgeVerifiedOnLoad);
  const [isLocked, setIsLocked] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('calendar');
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [forceAddMode, setForceAddMode] = useState(false);
  const [stampAnimationDate, setStampAnimationDate] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const [customSound, setCustomSound] = useState<string | null>(null);
  const [customBackground, setCustomBackground] = useState<CustomBackgroundConfig | null>(null);
  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig | null>(null);
  const [webDavBackups, setWebDavBackups] = useState<WebDavBackupFile[]>([]);
  const [webDavBusy, setWebDavBusy] = useState(false);
  const [pendingWebDavImport, setPendingWebDavImport] = useState<WebDavBackupFile | null>(null);
  const [showWebDavBackupPicker, setShowWebDavBackupPicker] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [sageModeEnabled, setSageModeEnabled] = useState(true);
  const [sageModeDurationMinutes, setSageModeDurationMinutes] = useState(DEFAULT_SAGE_MODE_DURATION_MINUTES);
  const [sageCooldownEndAt, setSageCooldownEndAt] = useState<number | null>(null);
  const [biometricUnlockEnabled, setBiometricUnlockEnabled] = useState(true);
  const [nowTs, setNowTs] = useState(Date.now());
  const darkMode = resolveDarkMode(themeMode, systemPrefersDark);

  // Modals state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showNoDataAlert, setShowNoDataAlert] = useState(false);
  const [showRemovePinConfirm, setShowRemovePinConfirm] = useState(false);
  const [calendarBackRequestToken, setCalendarBackRequestToken] = useState(0);

  // Refs for Long Press & Progress Ring (避免 setState 导致重绘卡顿，用 rAF + DOM 直接更新)
  const longPressTimer = useRef<number | null>(null);
  const progressAnimationRef = useRef<number | null>(null);
  const progressRingCircleRef = useRef<SVGCircleElement>(null);
  const startTimeRef = useRef<number>(0);
  const isLongPressActive = useRef(false);
  const isCurrentlyPressing = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  
  // Audio playback refs - Fix for sound bugs
  const audioCache = useRef<HTMLAudioElement | null>(null);
  const cachedSoundUrl = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lastPlayTime = useRef<number>(0);
  const isPlayingAudio = useRef(false);
  const isPlayingOscillator = useRef(false);
  const minPlayIntervalMs = 100;

  // Swipe navigation refs
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const isHorizontalSwipe = useRef<boolean>(false);
  const swipeSuspendedRef = useRef(false);
  const swipeLockedUntilRef = useRef(0);
  const settingsBackHandlerRef = useRef<(() => boolean) | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const slidesRef = useRef<HTMLDivElement | null>(null);
  const viewWidthRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDX, setDragDX] = useState(0);

  const cancelSwipeTracking = useCallback(() => {
    swipeStartX.current = null;
    swipeStartY.current = null;
    isHorizontalSwipe.current = false;
    setIsDragging(false);
    setDragDX(0);
  }, []);

  const setSwipeSuspended = useCallback(
    (locked: boolean, options?: { graceMs?: number }) => {
      swipeSuspendedRef.current = locked;
      if (!locked && options?.graceMs) {
        swipeLockedUntilRef.current = getSwipeLockGraceUntil(Date.now(), options.graceMs);
      }
      if (locked) {
        cancelSwipeTracking();
      }
    },
    [cancelSwipeTracking]
  );

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const preload = () => {
      void loadStatsView();
      settingsTimeoutId = window.setTimeout(() => {
        void loadSettingsView();
      }, 180);
    };

    let idleId: number | null = null;
    let timeoutId: number | null = null;
    let settingsTimeoutId: number | null = null;

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleId = idleWindow.requestIdleCallback(preload, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(preload, 600);
    }

    return () => {
      if (idleId != null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
      if (settingsTimeoutId != null) {
        window.clearTimeout(settingsTimeoutId);
      }
    };
  }, []);

  // Load Initial Data
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem(STORAGE_KEY);
      if (savedRecords) {
        try {
          setRecords(JSON.parse(savedRecords));
        } catch (e) {
          console.error("Failed to parse records", e);
        }
      }

      const pin = localStorage.getItem(PIN_KEY);
      if (pin) {
        setIsLocked(true);
        setCurrentPin(pin);
      }

      const savedThemeMode = localStorage.getItem(THEME_MODE_KEY);
      const savedTheme = localStorage.getItem(THEME_KEY);
      setThemeMode(parseStoredThemeMode(savedThemeMode, savedTheme));

      const savedIcon = localStorage.getItem(ICON_KEY);
      if (savedIcon) setCustomIcon(savedIcon);

      const savedSoundData = localStorage.getItem(CUSTOM_SOUND_KEY);
      if (savedSoundData) setCustomSound(savedSoundData);

      const savedBg = parseStoredBackgroundConfig(localStorage.getItem(CUSTOM_BACKGROUND_KEY));
      if (savedBg) setCustomBackground(savedBg);

      const savedWebDavConfig = parseStoredWebDavConfig(localStorage.getItem(WEBDAV_CONFIG_KEY));
      if (savedWebDavConfig) setWebDavConfig(savedWebDavConfig);

      const savedSound = localStorage.getItem(SOUND_KEY);
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }

      const savedSageEnabled = localStorage.getItem(SAGE_MODE_ENABLED_KEY);
      const sageEnabledOnLoad = savedSageEnabled === null ? true : savedSageEnabled === 'true';
      setSageModeEnabled(sageEnabledOnLoad);

      const savedSageDuration = Number(localStorage.getItem(SAGE_MODE_DURATION_KEY));
      if (Number.isFinite(savedSageDuration) && savedSageDuration >= 1) {
        setSageModeDurationMinutes(Math.min(1440, Math.round(savedSageDuration)));
      }

      const savedCooldownEnd = Number(localStorage.getItem(SAGE_MODE_COOLDOWN_END_KEY));
      if (sageEnabledOnLoad && Number.isFinite(savedCooldownEnd) && savedCooldownEnd > Date.now()) {
        setSageCooldownEndAt(savedCooldownEnd);
      }

      const savedBiometricUnlock = localStorage.getItem(BIOMETRIC_UNLOCK_ENABLED_KEY);
      setBiometricUnlockEnabled(savedBiometricUnlock === null ? true : savedBiometricUnlock === 'true');
    } catch (e) {
      console.error('❌ localStorage access failed:', e);
      // localStorage可能被禁用或已满，使用默认值
    }
    
    setIsInitialized(true);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    toastTimerRef.current = scheduleReplacingTimeout(
      toastTimerRef.current,
      () => {
        setToast(null);
        toastTimerRef.current = null;
      },
      3000,
      {
        clearTimeout: (timerId) => window.clearTimeout(timerId),
        setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
      }
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = (event?: MediaQueryListEvent) => {
      setSystemPrefersDark(event ? event.matches : mediaQuery.matches);
    };

    updateSystemTheme();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateSystemTheme);
      return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    }

    mediaQuery.addListener(updateSystemTheme);
    return () => mediaQuery.removeListener(updateSystemTheme);
  }, []);

  useEffect(() => {
    return () => {
      toastTimerRef.current = clearScheduledTimeout(toastTimerRef.current, {
        clearTimeout: (timerId) => window.clearTimeout(timerId),
      });
    };
  }, []);

  const formatSageCountdown = useCallback((remainingMs: number) => {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const sageRemainingMs = sageCooldownEndAt ? Math.max(0, sageCooldownEndAt - nowTs) : 0;
  const isSageModeActive = sageModeEnabled && sageRemainingMs > 0;
  const sageCountdownLabel = formatSageCountdown(sageRemainingMs);

  const handleSageModeEnabledChange = useCallback((enabled: boolean) => {
    setSageModeEnabled(enabled);
    if (!enabled) {
      setSageCooldownEndAt(null);
      setNowTs(Date.now());
    }
  }, []);

  // Persist Data
  useEffect(() => {
    // CRITICAL: Stop persistence if we are in the middle of clearing
    if (isInitialized && !isClearing) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        localStorage.setItem(THEME_KEY, String(darkMode));
        localStorage.setItem(THEME_MODE_KEY, themeMode);
        localStorage.setItem(SOUND_KEY, String(soundEnabled));
        localStorage.setItem(SAGE_MODE_ENABLED_KEY, String(sageModeEnabled));
        localStorage.setItem(SAGE_MODE_DURATION_KEY, String(sageModeDurationMinutes));
        localStorage.setItem(BIOMETRIC_UNLOCK_ENABLED_KEY, String(biometricUnlockEnabled));
        if (customIcon) localStorage.setItem(ICON_KEY, customIcon);
        else localStorage.removeItem(ICON_KEY);
        if (customSound) localStorage.setItem(CUSTOM_SOUND_KEY, customSound);
        else localStorage.removeItem(CUSTOM_SOUND_KEY);
        if (customBackground) localStorage.setItem(CUSTOM_BACKGROUND_KEY, serializeBackgroundConfig(customBackground) as string);
        else localStorage.removeItem(CUSTOM_BACKGROUND_KEY);
        if (webDavConfig) localStorage.setItem(WEBDAV_CONFIG_KEY, serializeWebDavConfig(webDavConfig) as string);
        else localStorage.removeItem(WEBDAV_CONFIG_KEY);
      } catch (e: unknown) {
        console.error('localStorage write failed:', e);
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          showToast('存储空间已满，请清理数据');
        }
      }
    }
  }, [records, darkMode, themeMode, customIcon, customSound, customBackground, webDavConfig, soundEnabled, sageModeEnabled, sageModeDurationMinutes, biometricUnlockEnabled, isInitialized, isClearing, showToast]);

  useEffect(() => {
    try {
      if (sageCooldownEndAt && sageCooldownEndAt > Date.now()) {
        localStorage.setItem(SAGE_MODE_COOLDOWN_END_KEY, String(sageCooldownEndAt));
      } else {
        localStorage.removeItem(SAGE_MODE_COOLDOWN_END_KEY);
      }
    } catch (e) {
      console.error('Failed to persist sage mode cooldown', e);
    }
  }, [sageCooldownEndAt]);

  useEffect(() => {
    if (!sageCooldownEndAt) return undefined;

    const tick = () => {
      const current = Date.now();
      setNowTs(current);
      if (current >= sageCooldownEndAt) {
        setSageCooldownEndAt(null);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [sageCooldownEndAt]);

  const playPunchSound = useCallback((force = false) => {
    const currentSoundEnabled = localStorage.getItem(SOUND_KEY) === 'true';
    const currentCustomSound = localStorage.getItem(CUSTOM_SOUND_KEY);

    if (!currentSoundEnabled && !force) return;

    const now = Date.now();
    if (now - lastPlayTime.current < minPlayIntervalMs) return;
    lastPlayTime.current = now;

    if (currentCustomSound) {
      if (cachedSoundUrl.current !== currentCustomSound) {
        if (audioCache.current) {
          audioCache.current.pause();
          audioCache.current.currentTime = 0;
        }
        audioCache.current = new Audio(currentCustomSound);
        cachedSoundUrl.current = currentCustomSound;
        audioCache.current.volume = 1;
        audioCache.current.onended = () => {
          isPlayingAudio.current = false;
        };
      }

      if (audioCache.current) {
        audioCache.current.currentTime = 0;
        isPlayingAudio.current = true;
        audioCache.current.play().catch(() => {
          // 用户未交互或权限问题，静默失败
        });
      }
      return;
    }

    try {
      // 重用AudioContext而不是每次创建新的
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // 停止之前的振荡器
      if (oscillatorRef.current && isPlayingOscillator.current) {
        try {
          oscillatorRef.current.stop();
          isPlayingOscillator.current = false;
        } catch (e) {
          // oscillator 已停止
        }
      }

      const audioCtx = audioContextRef.current;
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); 
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      isPlayingOscillator.current = true;
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);

      setTimeout(() => {
        isPlayingOscillator.current = false;
      }, 400);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  }, []);

  const handleAgeConfirm = () => {
    localStorage.setItem(AGE_VERIFIED_KEY, 'true');
    setShowSplash(false);
  };

  const addRecord = useCallback((draft: RecordEntryDraft = {}): boolean => {
    if (isSageModeActive) {
      showToast(`贤者模式中，请等待 ${sageCountdownLabel}`);
      return false;
    }

    const {
      date,
      mood,
      note,
      durationMinutes,
      watchedMovie = false,
      movieCategory,
    } = draft;
    const now = new Date();
    const targetDate = date ? new Date(date) : now;
    if (date) {
      targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }
    const newRecord: RecordEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: targetDate.getTime(),
      mood: mood || '放松',
      note,
      durationMinutes,
      watchedMovie,
      movieCategory: watchedMovie ? movieCategory : undefined,
    };
    setRecords(prev => [...prev, newRecord]);
    const formattedDate = getLocalDateString(targetDate);
    setStampAnimationDate(formattedDate);
    setTimeout(() => setStampAnimationDate(null), 1500);
    playPunchSound();

    if (sageModeEnabled) {
      const cooldownEndAt = Date.now() + sageModeDurationMinutes * 60 * 1000;
      setSageCooldownEndAt(cooldownEndAt);
      setNowTs(Date.now());
    }
    return true;
  }, [isSageModeActive, playPunchSound, sageCountdownLabel, sageModeDurationMinutes, sageModeEnabled, showToast]);

  const circumference = 78 * 2 * Math.PI;

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (progressAnimationRef.current != null) {
      cancelAnimationFrame(progressAnimationRef.current);
      progressAnimationRef.current = null;
    }
    const circle = progressRingCircleRef.current;
    if (circle) {
      circle.style.strokeDashoffset = String(circumference);
    }
  }, []);

  const startPress = useCallback(() => {
    if (isSageModeActive) {
      showToast(`贤者模式中，请等待 ${sageCountdownLabel}`);
      return;
    }

    isLongPressActive.current = false;
    isCurrentlyPressing.current = true;

    const circle = progressRingCircleRef.current;
    if (circle) {
      circle.style.strokeDashoffset = String(circumference);
    }

    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min((elapsed / LONG_PRESS_THRESHOLD) * 100, 100);
      const offset = circumference - (progress / 100) * circumference;
      const el = progressRingCircleRef.current;
      if (el) {
        el.style.strokeDashoffset = String(offset);
      }
      if (progress >= 100) {
        progressAnimationRef.current = null;
        return;
      }
      progressAnimationRef.current = requestAnimationFrame(tick);
    };
    progressAnimationRef.current = requestAnimationFrame(tick);

    longPressTimer.current = window.setTimeout(() => {
      isLongPressActive.current = true;
      clearTimers();

      if (navigator.vibrate) navigator.vibrate(50);
      setSelectedDate(getLocalDateString());
      setForceAddMode(true);
      setIsDetailOpen(true);
      isCurrentlyPressing.current = false;
    }, LONG_PRESS_THRESHOLD);
  }, [clearTimers, isSageModeActive, sageCountdownLabel, showToast]);

  const endPress = useCallback(() => {
    if (!isCurrentlyPressing.current) return;

    const wasLong = isLongPressActive.current;
    clearTimers();

    if (!wasLong) {
      addRecord();
    }

    isLongPressActive.current = false;
    isCurrentlyPressing.current = false;
  }, [clearTimers, addRecord]);

  // Helpers for swipe navigation
  const navigateToView = (view: ViewType) => {
    clearNativeTextSelection();
    cancelSwipeTracking();
    swipeSuspendedRef.current = false;
    swipeLockedUntilRef.current = 0;

    if (view === 'stats') {
      void loadStatsView();
    }
    if (view === 'settings') {
      void loadSettingsView();
    }
    setCurrentView(view);
  };

  const setViewByIndex = (i: number) => {
    navigateToView(i === 0 ? 'calendar' : i === 1 ? 'stats' : 'settings');
  };

  const isSwipeBlocked = (target: EventTarget | null) =>
    shouldBlockSwipeInteraction(target, swipeSuspendedRef.current, swipeLockedUntilRef.current, Date.now());

  const handleSwipeStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    if (isSwipeBlocked(e.target)) {
      cancelSwipeTracking();
      return;
    }
    swipeStartX.current = t.clientX;
    swipeStartY.current = t.clientY;
    isHorizontalSwipe.current = false;
    viewWidthRef.current = mainRef.current?.offsetWidth || window.innerWidth || 360;
    setDragDX(0);
    setIsDragging(false);
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (isSwipeBlocked(e.target)) {
      cancelSwipeTracking();
      return;
    }
    if (swipeStartX.current == null || swipeStartY.current == null) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - swipeStartX.current;
    const dy = t.clientY - swipeStartY.current;
    if (!isHorizontalSwipe.current) {
      if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) {
        isHorizontalSwipe.current = true;
      }
    }
    if (isHorizontalSwipe.current) {
      e.preventDefault();
      const viewWidth = viewWidthRef.current || mainRef.current?.offsetWidth || window.innerWidth || 360;
      const maxDrag = viewWidth * 0.92;
      const clampedDX = Math.max(-maxDrag, Math.min(maxDrag, dx));
      setIsDragging(true);
      setDragDX(clampedDX);
    }
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (isSwipeBlocked(e.target)) {
      cancelSwipeTracking();
      return;
    }
    if (swipeStartX.current == null || swipeStartY.current == null) return;
    const t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e.touches[0];
    if (!t) {
      cancelSwipeTracking();
      return;
    }
    const dx = t.clientX - swipeStartX.current;
    const dy = t.clientY - swipeStartY.current;
    const viewWidth = viewWidthRef.current || mainRef.current?.offsetWidth || window.innerWidth || 360;
    const threshold = Math.max(60, viewWidth * 0.2);

    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
      const index = getViewIndex();
      const nextIndex = Math.max(0, Math.min(2, index + (dx < 0 ? 1 : -1)));
      setViewByIndex(nextIndex);
    }

    cancelSwipeTracking();
  };

  const handleSwipeCancel = () => {
    cancelSwipeTracking();
  };

  const handleNativeBack = useCallback(async () => {
    if (showChangeLog) {
      setShowChangeLog(false);
      return;
    }
    if (showRemovePinConfirm) {
      setShowRemovePinConfirm(false);
      return;
    }
    if (showClearConfirm) {
      setShowClearConfirm(false);
      return;
    }
    if (showExportConfirm) {
      setShowExportConfirm(false);
      return;
    }
    if (showNoDataAlert) {
      setShowNoDataAlert(false);
      return;
    }
    if (settingsBackHandlerRef.current?.()) {
      return;
    }
    if (isDetailOpen) {
      setIsDetailOpen(false);
      setForceAddMode(false);
      return;
    }
    if (isDatePickerOpen) {
      setCalendarBackRequestToken((prev) => prev + 1);
      return;
    }
    if (currentView !== 'calendar') {
      setViewByIndex(0);
      return;
    }
    await CapacitorApp.exitApp();
  }, [
    currentView,
    isDatePickerOpen,
    isDetailOpen,
    showChangeLog,
    showClearConfirm,
    showExportConfirm,
    showNoDataAlert,
    showRemovePinConfirm,
  ]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    void CapacitorApp.addListener('backButton', () => {
      void handleNativeBack();
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      void listenerHandle?.remove();
    };
  }, [handleNativeBack]);

  const handleCancelPress = useCallback(() => {
    clearTimers();
    isLongPressActive.current = false;
    isCurrentlyPressing.current = false;
  }, [clearTimers]);

  const clearAll = useCallback(() => {
    // 1. 设置清除中标识，防止 Effect 触发写回 localStorage
    setIsClearing(true);
    
    // 2. 仅清理本应用使用的 Key，避免误删同域其他数据
    removeStorageKeys(localStorage, APP_STORAGE_KEYS);
    
    // 3. 重置内存中的所有状态到初始值
    setRecords([]);
    setCustomIcon(null);
    setCustomSound(null);
    setCustomBackground(null);
    setWebDavConfig(null);
    setWebDavBackups([]);
    setPendingWebDavImport(null);
    setThemeMode('system');
    setSoundEnabled(true);
    setSageModeEnabled(true);
    setSageModeDurationMinutes(DEFAULT_SAGE_MODE_DURATION_MINUTES);
    setSageCooldownEndAt(null);
    setBiometricUnlockEnabled(true);
    setNowTs(Date.now());
    setIsLocked(false);
    setCurrentView('calendar');
    
    setTimeout(() => {
      setShowSplash(true);
      setIsClearing(false);
      showToast('所有本地记录已清除');
    }, 200);
  }, [showToast]);

  const executeExport = async () => {
    if (records.length === 0) {
      showToast('没有记录可供导出');
      return;
    }

    try {
      const csvContent = serializeRecordsToCsv(records);
      
      const filename = `lulemo_export_${getLocalDateString()}.csv`;
      
      try {
        // 优先写入应用文档目录，兼容新 Android 存储策略
        try {
          await Filesystem.mkdir({
            path: 'lulemo',
            directory: Directory.Documents,
            recursive: true
          });
        } catch {
          // 文件夹可能已存在，继续执行
        }

        const result = await Filesystem.writeFile({
          path: `lulemo/${filename}`,
          data: csvContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        
        setShowExportConfirm(false);

        localStorage.setItem(LAST_EXPORT_FILE_KEY, result.uri);
        localStorage.setItem(LAST_EXPORT_FILENAME_KEY, filename);
        
        showToast(`✨ 已保存\n📁 Documents/lulemo\n📄 ${filename}`);
        
      } catch (fsError: unknown) {
        const msg = fsError instanceof Error ? fsError.message : '';
        console.error('Download write failed, trying Cache:', msg);

        // 备选方案：保存到缓存目录
        try {
          const cacheResult = await Filesystem.writeFile({
            path: filename,
            data: csvContent,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
          
          console.log('✅ File saved to Cache:', cacheResult.uri);
          
          setShowExportConfirm(false);
          localStorage.setItem(LAST_EXPORT_FILE_KEY, cacheResult.uri);
          localStorage.setItem(LAST_EXPORT_FILENAME_KEY, filename);
          
          showToast(`✨ 已保存\n📄 ${filename}`);
        } catch (cacheError: unknown) {
          const msg = cacheError instanceof Error ? cacheError.message : '未知错误';
          console.error('Cache write failed:', msg);
          setShowExportConfirm(false);
          showToast(`导出失败: ${msg}`);
        }
      }
    } catch (e: unknown) {
      console.error('Export error:', e instanceof Error ? e.message : e);
      setShowExportConfirm(false);
      showToast('导出失败，请重试');
    }
  };

  const requireWebDavConfig = useCallback(() => {
    if (!webDavConfig?.url) {
      showToast('请先配置 WebDAV');
      return null;
    }
    return normalizeWebDavConfig(webDavConfig);
  }, [showToast, webDavConfig]);

  const saveWebDavConfig = useCallback((config: WebDavConfig | null) => {
    const normalized = config ? normalizeWebDavConfig(config) : null;
    setWebDavConfig(normalized?.url ? normalized : null);
    if (!normalized?.url) {
      setWebDavBackups([]);
      showToast('已清除 WebDAV 配置');
      return;
    }
    showToast('WebDAV 配置已保存');
  }, [showToast]);

  const runWebDavAction = useCallback(async (action: () => Promise<void>) => {
    if (webDavBusy) return;
    setWebDavBusy(true);
    try {
      await action();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'WebDAV 操作失败';
      showToast(msg);
    } finally {
      setWebDavBusy(false);
    }
  }, [showToast, webDavBusy]);

  const handleWebDavTest = useCallback(async () => {
    const config = requireWebDavConfig();
    if (!config) return;
    await runWebDavAction(async () => {
      await testWebDavConnection(config);
      showToast('WebDAV 连接正常');
    });
  }, [requireWebDavConfig, runWebDavAction, showToast]);

  const handleWebDavUpload = useCallback(async () => {
    const config = requireWebDavConfig();
    if (!config) return;
    if (records.length === 0) {
      showToast('没有记录可供备份');
      return;
    }
    await runWebDavAction(async () => {
      const csvContent = serializeRecordsToCsv(records);
      const result = await uploadWebDavBackup(config, csvContent);
      setWebDavBackups((prev) => {
        const next = new Map<string, WebDavBackupFile>(prev.map((backup) => [backup.name, backup]));
        next.set(result.latest.name, result.latest);
        next.set(result.timestamped.name, result.timestamped);
        return Array.from(next.values()).sort((a, b) => {
          if (a.isLatest !== b.isLatest) return a.isLatest ? -1 : 1;
          return b.name.localeCompare(a.name);
        });
      });
      showToast(`WebDAV 备份成功\n${result.timestamped.name}`);
    });
  }, [records, requireWebDavConfig, runWebDavAction, showToast]);

  const handleWebDavRefresh = useCallback(async () => {
    const config = requireWebDavConfig();
    if (!config) return;
    await runWebDavAction(async () => {
      const backups = await listWebDavBackups(config);
      setWebDavBackups(backups);
      showToast(backups.length > 0 ? `找到 ${backups.length} 个云端备份` : '云端暂无备份文件');
    });
  }, [requireWebDavConfig, runWebDavAction, showToast]);

  const handleWebDavImportLatestRequest = useCallback(() => {
    const config = requireWebDavConfig();
    if (!config) return;
    setPendingWebDavImport(getLatestWebDavBackup(config));
  }, [requireWebDavConfig]);

  const handleWebDavOpenBackupPicker = useCallback(() => {
    const config = requireWebDavConfig();
    if (!config) return;
    setShowWebDavBackupPicker(true);
    void handleWebDavRefresh();
  }, [handleWebDavRefresh, requireWebDavConfig]);

  const handleWebDavImportRequest = useCallback((backup: WebDavBackupFile) => {
    setShowWebDavBackupPicker(false);
    setPendingWebDavImport(backup);
  }, []);

  const executeWebDavImport = useCallback(async (backup: WebDavBackupFile) => {
    const config = requireWebDavConfig();
    if (!config) return;
    await runWebDavAction(async () => {
      let csvText: string;
      try {
        csvText = await downloadWebDavBackup(config, backup);
      } catch (error) {
        if (error instanceof Error && error.message.includes('云端备份不存在')) {
          setWebDavBackups((prev) => prev.filter((item) => item.name !== backup.name));
          setPendingWebDavImport(null);
        }
        throw error;
      }
      const importedRecords = parseRecordEntriesFromCsv(csvText);
      const { merged, importedCount, skippedCount } = mergeImportedRecords(records, importedRecords);
      setRecords(merged);
      setPendingWebDavImport(null);
      showToast(
        skippedCount > 0
          ? `WebDAV 导入 ${importedCount} 条\n跳过重复 ${skippedCount} 条`
          : `WebDAV 导入 ${importedCount} 条`
      );
    });
  }, [records, requireWebDavConfig, runWebDavAction, showToast]);

  const shareLastExport = async () => {
    const fileUri = localStorage.getItem(LAST_EXPORT_FILE_KEY);
    const filename = localStorage.getItem(LAST_EXPORT_FILENAME_KEY);

    if (!fileUri) {
      showToast('没有可分享的文件，请先导出数据');
      return;
    }

    try {
      await Share.share({
        title: '分享鹿了么数据',
        text: `导出数据：${filename ?? ''}`,
        url: fileUri,
        dialogTitle: '选择分享方式',
      });
      showToast('✨ 分享成功');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (/cancel/i.test(msg)) {
        showToast('已取消分享');
      } else {
        showToast('分享失败，请重试');
      }
    }
  };

  const removePin = () => {
    removeStorageKeys(localStorage, PIN_SECURITY_STORAGE_KEYS);
    setCurrentPin(null);
    setBiometricUnlockEnabled(false);
    setShowRemovePinConfirm(false);
    showToast('已移除 PIN 码锁定');
  };

  const radius = 80;
  const stroke = 3;
  const normalizedRadius = 78;

  const getViewIndex = () => {
    switch(currentView) {
      case 'calendar': return 0;
      case 'stats': return 1;
      case 'settings': return 2;
      default: return 0;
    }
  };

  const viewWidth = viewWidthRef.current || mainRef.current?.offsetWidth || window.innerWidth || 360;
  const dragTranslatePx = Math.max(
    -2 * viewWidth,
    Math.min(0, -(getViewIndex() * viewWidth) + dragDX)
  );
  const toastDisplay = toast ? parseToastDisplay(toast) : null;

  return (
    <div
      className={`${darkMode ? 'dark' : ''}`}
      style={{ transition: 'background-color 0.5s linear, color 0.5s linear' }}
    >
      <div
        className="flex flex-col h-screen max-w-md mx-auto forest-bg shadow-2xl relative overflow-hidden transition-colors duration-500 ease-linear"
        style={{
          transitionProperty: 'background-color, border-color, color, box-shadow',
        }}
      >
        {customBackground && (
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={customBackground.src}
              alt=""
              className="w-full h-full object-cover select-none"
              style={buildBackgroundImageStyle(customBackground)}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: darkMode
                  ? 'linear-gradient(rgba(10,15,11,0.92), rgba(13,22,15,0.88))'
                  : 'linear-gradient(rgba(241,248,233,0.88), rgba(241,248,233,0.82))',
              }}
            />
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none shrink-0 z-10 forest-bg"
          style={{
            height: 'env(safe-area-inset-top, 0px)',
            backgroundPosition: 'center top',
          }}
        />
        <header
          className="bg-[#eef6e5]/74 dark:bg-slate-900/78 backdrop-blur-md p-4 flex justify-between items-center border-b border-green-100/70 dark:border-slate-800 z-10 shrink-0 transition-all duration-500 ease-linear"
          style={{
            transitionProperty: 'background-color, border-color, color',
          }}
        >
          <h1 className="text-xl font-bold text-green-800 dark:text-green-400 flex items-center gap-2 transition-colors duration-500 ease-linear">
            <span>🦌</span> 了么
          </h1>
          <div className="text-xs text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full font-bold transition-all duration-500 ease-linear">隐私模式</div>
        </header>

          <main
            ref={mainRef}
            className="flex-1 relative overflow-hidden"
            style={{ touchAction: 'pan-y' }}
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
            onTouchCancel={handleSwipeCancel}
            onContextMenu={(e) => {
              if (isSwipeBlocked(e.target)) {
                swipeLockedUntilRef.current = getSwipeLockGraceUntil(Date.now(), SWIPE_LOCK_GRACE_MS);
              }
              handleSwipeCancel();
            }}
          >
          <div 
              ref={slidesRef}
              className={`flex h-full w-[300%] ${isDragging ? '' : 'transition-transform duration-500 ease-out'}`}
              style={{ 
                touchAction: 'pan-y',
                transform: isDragging 
                  ? `translateX(${dragTranslatePx}px)` 
                  : `translateX(-${getViewIndex() * 33.333}%)`
              }}
          >
            <div className="w-1/3 h-full overflow-y-auto pb-48 px-0 custom-scroll">
              <CalendarView 
                records={records} 
                onDateClick={(date) => {
                  setSelectedDate(date);
                  setForceAddMode(false);
                  setIsDetailOpen(true);
                }}
                stampAnimationDate={stampAnimationDate}
                darkMode={darkMode}
                onDatePickerOpenChange={setIsDatePickerOpen}
                requestDatePickerCloseToken={calendarBackRequestToken}
              />
            </div>
            <div className="w-1/3 h-full overflow-y-auto pb-48 px-0 custom-scroll">
              <Suspense fallback={<StatsViewFallback />}>
                <LazyStatsView records={records} darkMode={darkMode} />
              </Suspense>
            </div>
            <div className="w-1/3 h-full overflow-y-auto pb-48 px-0 custom-scroll">
              <Suspense fallback={<SettingsViewFallback />}>
                <LazySettingsView
                  onClear={() => setShowClearConfirm(true)}
                  records={records}
                  darkMode={darkMode}
                  themeMode={themeMode}
                  onThemeModeChange={setThemeMode}
                  onSwipeLockChange={setSwipeSuspended}
                  registerBackHandler={(handler) => {
                    settingsBackHandlerRef.current = handler;
                  }}
                  soundEnabled={soundEnabled}
                  toggleSound={() => setSoundEnabled(!soundEnabled)}
                  onTestSound={() => playPunchSound(true)}
                  customSound={customSound}
                  setCustomSound={setCustomSound}
                  customIcon={customIcon}
                  setCustomIcon={setCustomIcon}
                  customBackground={customBackground}
                  setCustomBackground={setCustomBackground}
                  onImportRecords={(nr) => {
                    const { merged, importedCount, skippedCount } = mergeImportedRecords(records, nr);
                    setRecords(merged);
                    showToast(
                      skippedCount > 0
                        ? `成功导入 ${importedCount} 条数据\n跳过重复 ${skippedCount} 条`
                        : `成功导入 ${importedCount} 条数据`
                    );
                  }}
                  onExportRequest={() => {
                    if (records.length === 0) setShowNoDataAlert(true);
                    else setShowExportConfirm(true);
                  }}
                  onShareExport={() => shareLastExport()}
                  webDavConfig={webDavConfig}
                  webDavBackups={webDavBackups}
                  webDavBusy={webDavBusy}
                  onWebDavConfigSave={saveWebDavConfig}
                  onWebDavTest={handleWebDavTest}
                  onWebDavUpload={handleWebDavUpload}
                  onWebDavOpenBackupList={handleWebDavOpenBackupPicker}
                  onShowChangeLog={() => setShowChangeLog(true)}
                  onRemovePinRequest={() => setShowRemovePinConfirm(true)}
                  currentPin={currentPin}
                  onPinChange={(pin) => setCurrentPin(pin)}
                  biometricUnlockEnabled={biometricUnlockEnabled}
                  onBiometricUnlockEnabledChange={setBiometricUnlockEnabled}
                  sageModeEnabled={sageModeEnabled}
                  onSageModeEnabledChange={handleSageModeEnabledChange}
                  sageModeDurationMinutes={sageModeDurationMinutes}
                  onSageModeDurationChange={setSageModeDurationMinutes}
                />
              </Suspense>
            </div>
          </div>
        </main>

        {isDatePickerOpen && (
          <div
            className="absolute inset-0 z-[40] pointer-events-none bg-black/35 dark:bg-black/45 backdrop-blur-[6px] animate-in fade-in duration-300"
            aria-hidden="true"
          />
        )}

        <div
          className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-30 origin-center ${
            currentView === 'calendar' && !isDatePickerOpen
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-0 pointer-events-none'
          }`}
          style={{ transition: 'opacity 0.45s linear, transform 0.45s linear' }}
        >
          <div className="punch-btn-container group">
            <svg height={radius * 2} width={radius * 2} className="progress-ring absolute pointer-events-none overflow-visible">
              <circle
                stroke={darkMode ? '#4ade8022' : '#4CAF5022'}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset: 0 }}
                strokeWidth={1}
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                ref={progressRingCircleRef}
                className="progress-ring__circle"
                stroke={darkMode ? '#4ade80' : '#4CAF50'}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset: circumference }}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>

            <div className="ripple-effect"></div>
            <div className="active-ripple"></div>
            <div className="button-bg-circle shadow-lg ring-4 ring-white/50 dark:ring-slate-800/50">
              {isSageModeActive ? (
                <div className="flex flex-col items-center justify-center select-none text-green-700 dark:text-green-300">
                  <FaIcon name="clock" className="sage-alarm-icon text-4xl mb-1" />
                  <span className="sage-countdown-text text-sm font-black tracking-wider">{sageCountdownLabel}</span>
                </div>
              ) : customIcon ? (
                <img src={customIcon} alt="图标" className="deer-icon-img" />
              ) : (
                <span className="text-6xl animate-pulse select-none">🦌</span>
              )}
            </div>
            <button 
              disabled={isSageModeActive}
              onMouseDown={startPress}
              onMouseUp={endPress}
              onMouseLeave={handleCancelPress}
              onTouchStart={(e) => { e.preventDefault(); startPress(); }}
              onTouchEnd={(e) => { e.preventDefault(); endPress(); }}
              className={`absolute inset-0 z-20 rounded-full outline-none select-none touch-none ${isSageModeActive ? 'cursor-not-allowed opacity-80' : ''}`}
              aria-label="打卡"
            />
          </div>
          {isSageModeActive && (
            <div className="mt-3 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100/90 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                贤者模式中 · 剩余 {sageCountdownLabel}
              </span>
            </div>
          )}
        </div>

        <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-green-100 dark:border-slate-800 flex justify-around py-4 shrink-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <button onClick={() => navigateToView('calendar')} className={`flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'calendar' ? 'text-green-600' : 'text-gray-400'}`}>
            <FaIcon name="calendar-days" className={`text-xl transition-transform ${currentView === 'calendar' ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-bold">日历</span>
          </button>
          <button
            onClick={() => {
              navigateToView('stats');
            }}
            className={`flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'stats' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <FaIcon name="chart-simple" className={`text-xl transition-transform ${currentView === 'stats' ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-bold">统计</span>
          </button>
          <button
            onClick={() => {
              navigateToView('settings');
            }}
            className={`flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'settings' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <FaIcon name="gear" className={`text-xl transition-transform ${currentView === 'settings' ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-bold">设置</span>
          </button>
        </nav>

        {toastDisplay && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300 px-4 w-full flex justify-center">
            {toastDisplay.kind === 'export-saved' ? (
              <div className="w-full max-w-[18.5rem] rounded-[1.75rem] border border-emerald-400/35 bg-[linear-gradient(180deg,rgba(21,160,76,0.96),rgba(25,179,86,0.94))] text-white shadow-[0_20px_50px_rgba(16,118,58,0.34)] backdrop-blur-xl overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                  <div className="mt-0.5 w-10 h-10 shrink-0 rounded-2xl bg-white/16 border border-white/20 flex items-center justify-center">
                    <FaIcon name="circle-check" className="text-base" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-black tracking-[0.01em]">{toastDisplay.title}</p>
                    <p className="text-[11px] text-emerald-50/85 mt-0.5">文件已成功导出到本地目录</p>
                  </div>
                </div>
                <div className="px-4 pb-4 space-y-2.5">
                  {toastDisplay.path && (
                    <div className="rounded-2xl bg-black/10 border border-white/14 px-3 py-2.5">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-emerald-50/75">
                        <FaIcon name="folder-open" className="text-[11px]" />
                        <span>保存位置</span>
                      </div>
                      <p className="mt-1.5 text-[13px] font-bold leading-snug break-all">{toastDisplay.path}</p>
                    </div>
                  )}
                  {toastDisplay.filename && (
                    <div className="rounded-2xl bg-white/12 border border-white/14 px-3 py-2.5">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-emerald-50/75">
                        <FaIcon name="file-lines" className="text-[11px]" />
                        <span>文件名</span>
                      </div>
                      <p className="mt-1.5 text-[13px] font-bold leading-snug break-all">{toastDisplay.filename}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-start gap-3 border border-green-500/50 backdrop-blur-sm max-w-xs">
                <FaIcon name="circle-check" className="mt-0.5 flex-shrink-0" />
                <span className="text-sm font-bold whitespace-pre-line leading-relaxed">{toastDisplay.message}</span>
              </div>
            )}
          </div>
        )}

        {isDetailOpen && selectedDate && (
          <DetailModal 
            date={selectedDate}
            records={records.filter(r => getLocalDateString(new Date(r.timestamp)) === selectedDate)}
            onClose={() => { setIsDetailOpen(false); setForceAddMode(false); }}
            onDelete={(id) => setRecords(prev => prev.filter(r => r.id !== id))}
            onAdd={addRecord}
            darkMode={darkMode}
            initialAddMode={forceAddMode}
          />
        )}

        {showExportConfirm && (
          <DataDialog onClose={() => setShowExportConfirm(false)}>
            {({ isClosing, requestClose }) => (
              <div className={`${isClosing ? 'data-dialog-sheet-out' : 'data-dialog-sheet'} w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-green-100 dark:border-slate-800`} onClick={e => e.stopPropagation()}>
                <div className="text-center">
                  <span className="text-5xl block mb-4">🦌📄</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">确认导出数据？</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                    您的记录将以 CSV 文件格式下载到此设备。
                  </p>
                  <div className="space-y-3">
                    <button 
                      onClick={() => requestClose(() => {
                        void executeExport();
                      })}
                      className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 transition-all active:scale-95"
                    >
                      导出
                    </button>
                    <button 
                      onClick={() => requestClose()}
                      className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DataDialog>
        )}

        {showNoDataAlert && (
          <DataDialog onClose={() => setShowNoDataAlert(false)}>
            {({ isClosing, requestClose }) => (
              <div className={`${isClosing ? 'data-dialog-sheet-out' : 'data-dialog-sheet'} w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-yellow-100 dark:border-yellow-900/30`} onClick={e => e.stopPropagation()}>
                <div className="text-center">
                  <span className="text-5xl block mb-4">🦌💨</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">暂无数据</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                    还没有任何打卡记录，先去主页打个卡吧！
                  </p>
                  <button 
                    onClick={() => requestClose()}
                    className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-2xl shadow-lg shadow-yellow-500/30 transition-all active:scale-95"
                  >
                    我知道了
                  </button>
                </div>
              </div>
            )}
          </DataDialog>
        )}

        {showWebDavBackupPicker && (
          <DataDialog onClose={() => setShowWebDavBackupPicker(false)}>
            {({ isClosing, requestClose }) => (
              <div className={`${isClosing ? 'data-dialog-sheet-out' : 'data-dialog-sheet'} w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-cyan-100 dark:border-cyan-900/30`} onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">云端备份</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">选择一个 WebDAV 备份导入</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {webDavBusy && <FaIcon name="spinner" spin className="text-cyan-600 dark:text-cyan-300" />}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        void handleWebDavRefresh();
                      }}
                      disabled={webDavBusy}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 active:scale-[0.96] disabled:opacity-50 dark:bg-cyan-950/30 dark:text-cyan-200"
                      aria-label="刷新云端备份列表"
                    >
                      <FaIcon name="rotate" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => requestClose(() => handleWebDavImportLatestRequest())}
                    disabled={webDavBusy}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/80 px-4 py-3 text-left active:scale-[0.99] disabled:opacity-50 dark:border-cyan-900/40 dark:bg-cyan-950/25"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-cyan-900 dark:text-cyan-100">latest - 最新备份</div>
                      <div className="mt-0.5 text-[11px] text-cyan-700/70 dark:text-cyan-300/70">直接尝试下载 latest 文件</div>
                    </div>
                    <FaIcon name="cloud-arrow-down" className="shrink-0 text-cyan-600 dark:text-cyan-300" />
                  </button>

                  {webDavBackups.length > 0 ? (
                    webDavBackups
                      .filter((backup) => !backup.isLatest)
                      .map((backup) => (
                        <button
                          key={backup.name}
                          type="button"
                          onClick={() => requestClose(() => handleWebDavImportRequest(backup))}
                          disabled={webDavBusy}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left active:scale-[0.99] disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/70"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-gray-900 dark:text-slate-100">{backup.name}</div>
                            <div className="mt-0.5 text-[10px] text-gray-500 dark:text-slate-400">
                              {backup.lastModified || (backup.size != null ? `${backup.size} bytes` : '点击导入该云端备份')}
                            </div>
                          </div>
                          <FaIcon name="cloud-arrow-down" className="shrink-0 text-cyan-600 dark:text-cyan-300" />
                        </button>
                      ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/45 px-4 py-5 text-center text-xs font-medium text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/15 dark:text-cyan-300">
                      暂无云端备份，点右上角刷新或先上传一次
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => requestClose()}
                  className="mt-5 w-full rounded-2xl bg-gray-100 py-3.5 text-sm font-bold text-gray-600 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-300"
                >
                  取消
                </button>
              </div>
            )}
          </DataDialog>
        )}

        {pendingWebDavImport && (
          <DataDialog onClose={() => setPendingWebDavImport(null)}>
            {({ isClosing, requestClose }) => (
              <div className={`${isClosing ? 'data-dialog-sheet-out' : 'data-dialog-sheet'} w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-cyan-100 dark:border-cyan-900/30`} onClick={e => e.stopPropagation()}>
                <div className="text-center">
                  <span className="text-5xl block mb-4">☁️📥</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">从 WebDAV 导入？</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
                    将下载云端备份并合并到本地记录，重复 ID 会自动跳过。
                  </p>
                  <div className="mb-6 rounded-2xl bg-cyan-50 px-3 py-3 text-xs font-bold text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200">
                    {pendingWebDavImport.name}
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => requestClose(() => {
                        void executeWebDavImport(pendingWebDavImport);
                      })}
                      disabled={webDavBusy}
                      className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      确认导入
                    </button>
                    <button
                      onClick={() => requestClose()}
                      className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DataDialog>
        )}

        {showClearConfirm && (
          <DataDialog onClose={() => setShowClearConfirm(false)}>
            {({ isClosing, requestClose }) => (
              <div className={`${isClosing ? 'data-dialog-sheet-out' : 'data-dialog-sheet'} w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-red-100 dark:border-red-900/30`} onClick={e => e.stopPropagation()}>
                <div className="text-center">
                  <span className="text-5xl block mb-4">🦌💧</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">真的要再见吗？</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                    此操作将永久删除所有打卡数据、PIN 码和个性化设置。数据不可恢复。
                  </p>
                  <div className="space-y-3">
                    <button 
                      onClick={() => requestClose(() => {
                        clearAll();
                      })}
                      className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 transition-all active:scale-95"
                    >
                      确定永久清除
                    </button>
                    <button 
                      onClick={() => requestClose()}
                      className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                    >
                      我点错了，回去
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DataDialog>
        )}

        {showRemovePinConfirm && (
          <DataDialog onClose={() => setShowRemovePinConfirm(false)}>
            {({ isClosing, requestClose }) => (
              <div className={`${isClosing ? 'data-dialog-sheet-out' : 'data-dialog-sheet'} w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-purple-100 dark:border-purple-900/30`} onClick={e => e.stopPropagation()}>
                <div className="text-center">
                  <span className="text-5xl block mb-4">🔓</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">移除 PIN 码锁定？</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                    移除后将不再需要输入 PIN 码即可进入应用。
                  </p>
                  <div className="space-y-3">
                    <button 
                      onClick={() => requestClose(() => {
                        removePin();
                      })}
                      className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 transition-all active:scale-95"
                    >
                      确定移除
                    </button>
                    <button 
                      onClick={() => requestClose()}
                      className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DataDialog>
        )}

        {showChangeLog && (
          <ChangeLog 
            onClose={() => setShowChangeLog(false)}
            darkMode={darkMode}
          />
        )}
        
        {showSplash && <SplashScreen onConfirm={handleAgeConfirm} />}
        {isLocked && (
          <LockScreen
            onUnlock={() => setIsLocked(false)}
            biometricEnabled={biometricUnlockEnabled}
            onResetPin={() => {
              removeStorageKeys(localStorage, PIN_SECURITY_STORAGE_KEYS);
              setCurrentPin(null);
              setBiometricUnlockEnabled(false);
              setIsLocked(false);
              showToast('已重置 PIN，可在设置中重新设置');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
