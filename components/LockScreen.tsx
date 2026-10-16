import React, { useEffect, useRef, useState } from 'react';
import {
  PIN_KEY,
  SECURITY_QUESTION_KEY,
  SECURITY_ANSWER_KEY,
  SECURITY_QUESTIONS,
  PIN_FAILED_ATTEMPTS_KEY,
  PIN_LOCK_UNTIL_KEY,
} from '../constants';
import { hashSecret, isLegacyPlainSecret, verifySecret } from '../utils/secret';
import { BIOMETRY_LABEL, getBiometricAvailability, verifyBiometricIdentity } from '../utils/biometric';
import {
  createPinFailureState,
  DEFAULT_MAX_PIN_ATTEMPTS,
  DEFAULT_PIN_LOCK_DURATION_MS,
  readStoredNumber,
  sanitizeFailedAttempts,
  sanitizeLockUntil,
} from '../utils/pinLock';
import FaIcon from './FaIcon';

interface Props {
  onUnlock: () => void;
  biometricEnabled: boolean;
  /** 重置 PIN（清除 PIN 与安全问题后解锁） */
  onResetPin?: () => void;
}

const MAX_PIN_ATTEMPTS = DEFAULT_MAX_PIN_ATTEMPTS;
const PIN_LOCK_DURATION_MS = DEFAULT_PIN_LOCK_DURATION_MS;

const LockScreen: React.FC<Props> = ({ onUnlock, biometricEnabled, onResetPin }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [showResetReady, setShowResetReady] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [isVerifyingAnswer, setIsVerifyingAnswer] = useState(false);
  const [isVerifyingBiometric, setIsVerifyingBiometric] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('生物识别');
  const [biometricError, setBiometricError] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [failedPinAttempts, setFailedPinAttempts] = useState<number>(() => {
    return sanitizeFailedAttempts(readStoredNumber(localStorage, PIN_FAILED_ATTEMPTS_KEY), MAX_PIN_ATTEMPTS);
  });
  const [pinLockedUntil, setPinLockedUntil] = useState<number | null>(() => {
    return sanitizeLockUntil(readStoredNumber(localStorage, PIN_LOCK_UNTIL_KEY), Date.now());
  });
  const [nowTs, setNowTs] = useState(Date.now());
  const autoBiometricTriedRef = useRef(false);

  const storedPin = localStorage.getItem(PIN_KEY);
  const savedQuestionId = localStorage.getItem(SECURITY_QUESTION_KEY);
  const savedAnswer = localStorage.getItem(SECURITY_ANSWER_KEY);
  const questionLabel = savedQuestionId
    ? (SECURITY_QUESTIONS.find((q) => q.id === savedQuestionId)?.label ?? '')
    : '';

  useEffect(() => {
    let mounted = true;

    if (!biometricEnabled) {
      setIsBiometricAvailable(false);
      setBiometricError('');
      autoBiometricTriedRef.current = false;
      return () => {
        mounted = false;
      };
    }

    void getBiometricAvailability().then((result) => {
      if (!mounted) return;
      setIsBiometricAvailable(result.isAvailable);
      setBiometricLabel(BIOMETRY_LABEL[result.biometryType] ?? '生物识别');
    });

    return () => {
      mounted = false;
    };
  }, [biometricEnabled]);

  const handleBiometricUnlock = async (fromAuto = false) => {
    if (!biometricEnabled || !isBiometricAvailable || isVerifyingBiometric || isVerifyingPin || isVerifyingAnswer) {
      return;
    }
    setBiometricError('');
    setIsVerifyingBiometric(true);
    try {
      const result = await verifyBiometricIdentity();
      if (result.ok) {
        onUnlock();
        return;
      }
      if ('canceled' in result && (!result.canceled || !fromAuto)) {
        setBiometricError(result.message);
      }
    } finally {
      setIsVerifyingBiometric(false);
    }
  };

  useEffect(() => {
    if (!biometricEnabled || !isBiometricAvailable) return;
    if (showForgot || showResetReady) return;
    if (autoBiometricTriedRef.current) return;
    autoBiometricTriedRef.current = true;
    void handleBiometricUnlock(true);
  }, [biometricEnabled, isBiometricAvailable, showForgot, showResetReady]);

  useEffect(() => {
    if (failedPinAttempts > 0) {
      localStorage.setItem(PIN_FAILED_ATTEMPTS_KEY, String(failedPinAttempts));
    } else {
      localStorage.removeItem(PIN_FAILED_ATTEMPTS_KEY);
    }
  }, [failedPinAttempts]);

  useEffect(() => {
    if (pinLockedUntil && pinLockedUntil > Date.now()) {
      localStorage.setItem(PIN_LOCK_UNTIL_KEY, String(pinLockedUntil));
    } else {
      localStorage.removeItem(PIN_LOCK_UNTIL_KEY);
    }
  }, [pinLockedUntil]);

  useEffect(() => {
    if (!pinLockedUntil) return undefined;
    const tick = () => {
      const now = Date.now();
      setNowTs(now);
      if (now >= pinLockedUntil) {
        setPinLockedUntil(null);
        setFailedPinAttempts(0);
        setPinStatus('');
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [pinLockedUntil]);

  const pinRemainingMs = pinLockedUntil ? Math.max(0, pinLockedUntil - nowTs) : 0;
  const isPinLocked = pinRemainingMs > 0;
  const pinRemainingSeconds = Math.max(1, Math.ceil(pinRemainingMs / 1000));

  const clearPinAttackState = () => {
    setFailedPinAttempts(0);
    setPinLockedUntil(null);
    setPinStatus('');
    localStorage.removeItem(PIN_FAILED_ATTEMPTS_KEY);
    localStorage.removeItem(PIN_LOCK_UNTIL_KEY);
  };

  const handlePinFailed = () => {
    setError(true);
    setFailedPinAttempts((prev) => {
      const nextState = createPinFailureState(prev, Date.now(), MAX_PIN_ATTEMPTS, PIN_LOCK_DURATION_MS);
      if (nextState.shouldLock) {
        setPinLockedUntil(nextState.lockUntil);
        setInput('');
        setPinStatus(nextState.status);
        return nextState.failedAttempts;
      }
      setPinStatus(nextState.status);
      window.setTimeout(() => setInput(''), 500);
      return nextState.failedAttempts;
    });
  };

  const handleForgotSubmit = async () => {
    const trimmed = securityAnswer.trim();
    if (!savedAnswer || !questionLabel) {
      setForgotError('未设置安全问题，无法通过此方式找回。请回忆 PIN 或清除应用数据。');
      return;
    }
    if (!trimmed) {
      setForgotError('请输入答案');
      return;
    }

    setIsVerifyingAnswer(true);
    try {
      const ok = await verifySecret(trimmed, savedAnswer);
      if (!ok) {
        setForgotError('答案错误');
        return;
      }

      // Migrate legacy plaintext answer to hashed format after successful verification.
      if (isLegacyPlainSecret(savedAnswer)) {
        const hashedAnswer = await hashSecret(trimmed);
        localStorage.setItem(SECURITY_ANSWER_KEY, hashedAnswer);
      }

      setForgotError('');
      setSecurityAnswer('');
      setShowForgot(false);
      setShowResetReady(true);
    } catch (e) {
      console.error('Security answer verification failed', e);
      setForgotError('验证失败，请重试');
    } finally {
      setIsVerifyingAnswer(false);
    }
  };

  const handleResetPin = () => {
    setShowResetReady(false);
    clearPinAttackState();
    onResetPin?.();
  };

  const handlePress = (num: string) => {
    if (isVerifyingPin || isPinLocked) return;
    setBiometricError('');
    setPinStatus('');

    if (input.length < 4) {
      setError(false);
      const newInput = input + num;
      setInput(newInput);
      
      if (newInput.length === 4) {
        setIsVerifyingPin(true);
        verifySecret(newInput, storedPin)
          .then(async (ok) => {
            if (!ok) {
              handlePinFailed();
              return;
            }

            // Migrate legacy plaintext PIN to hashed format after successful unlock.
            if (isLegacyPlainSecret(storedPin)) {
              const hashedPin = await hashSecret(newInput);
              localStorage.setItem(PIN_KEY, hashedPin);
            }

            clearPinAttackState();
            onUnlock();
          })
          .catch((e) => {
            console.error('PIN verification failed', e);
            handlePinFailed();
          })
          .finally(() => {
            setIsVerifyingPin(false);
          });
      }
    }
  };

  const handleDelete = () => {
    if (isPinLocked) return;
    setInput(input.slice(0, -1));
    setError(false);
    setBiometricError('');
    setPinStatus('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F1F8E9] forest-bg p-8">
      <div className="mb-8 text-center animate-in fade-in zoom-in duration-500">
        <span className="text-6xl mb-4 block drop-shadow-lg">🦌</span>
        <h2 className="text-2xl font-bold text-green-800">隐私锁定</h2>
        <p className="text-sm text-green-600 mt-2">请输入 PIN 码解锁</p>
      </div>

      <div className={`flex gap-6 mb-12 ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => {
          const isActive = input.length > i;
          const isCurrent = input.length === i;
          return (
            <div 
              key={i} 
              className={`
                w-5 h-5 rounded-full border-2 transition-all duration-300 transform
                ${isActive 
                  ? 'bg-green-500 border-green-500 scale-110 shadow-[0_0_15px_rgba(34,197,94,0.6)]' 
                  : 'bg-white/50 border-green-200 scale-100'}
                ${isCurrent ? 'border-green-400 scale-105 animate-pulse' : ''}
                ${error ? 'border-red-500 bg-red-100 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : ''}
              `}
            />
          );
        })}
      </div>

      {(pinStatus || isPinLocked) && (
        <p className="text-xs text-red-500 mb-4 text-center">
          {isPinLocked
            ? `PIN 已锁定，请 ${pinRemainingSeconds} 秒后重试`
            : `${pinStatus}${failedPinAttempts > 0 ? `（已失败 ${failedPinAttempts}/${MAX_PIN_ATTEMPTS} 次）` : ''}`}
        </p>
      )}

      <div className="grid grid-cols-3 gap-6 animate-in slide-in-from-bottom-10 duration-500 delay-150">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button 
            key={n} 
            onClick={() => handlePress(n.toString())}
            disabled={isPinLocked}
            className={`w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-green-100 flex items-center justify-center text-xl font-bold text-green-800 transition-all duration-100 disabled:opacity-45 disabled:cursor-not-allowed ${
              isPinLocked ? '' : 'active:bg-green-500 active:text-white active:scale-90'
            }`}
          >
            {n}
          </button>
        ))}
        <div />
        <button 
          onClick={() => handlePress('0')}
          disabled={isPinLocked}
          className={`w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-green-100 flex items-center justify-center text-xl font-bold text-green-800 transition-all duration-100 disabled:opacity-45 disabled:cursor-not-allowed ${
            isPinLocked ? '' : 'active:bg-green-500 active:text-white active:scale-90'
          }`}
        >
          0
        </button>
        <button 
          onClick={handleDelete}
          disabled={isPinLocked}
          className={`w-16 h-16 flex items-center justify-center text-green-600 transition-transform disabled:opacity-45 disabled:cursor-not-allowed ${
            isPinLocked ? '' : 'active:scale-75'
          }`}
          aria-label="Delete"
        >
          <FaIcon name="delete-left" className="text-2xl" />
        </button>
      </div>

      {!showForgot && !showResetReady && biometricEnabled && isBiometricAvailable && (
        <div className="mt-5 w-full max-w-xs">
          <button
            type="button"
            onClick={() => void handleBiometricUnlock(false)}
            disabled={isVerifyingBiometric}
            className="w-full py-3 rounded-2xl bg-white/85 border border-green-200 text-green-700 font-bold shadow-sm backdrop-blur-sm active:scale-[0.98] transition disabled:opacity-60"
          >
            <FaIcon name={isVerifyingBiometric ? 'spinner' : 'fingerprint'} className="mr-2" spin={isVerifyingBiometric} />
            {isVerifyingBiometric ? '验证中...' : `使用${biometricLabel}解锁`}
          </button>
          {biometricError && (
            <p className="mt-2 text-xs text-red-500 text-center">{biometricError}</p>
          )}
        </div>
      )}

      {showResetReady ? (
        <div className="mt-6 w-full max-w-xs p-5 bg-white/95 dark:bg-slate-800/95 rounded-2xl border-2 border-green-300 dark:border-green-700 shadow-xl">
          <p className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-2">验证成功</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">为保护隐私，不显示原 PIN。可立即重置并解锁。</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetPin}
              className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl text-sm"
            >
              重置 PIN
            </button>
            <button
              type="button"
              onClick={() => setShowResetReady(false)}
              className="flex-1 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold rounded-xl text-sm"
            >
              返回
            </button>
          </div>
        </div>
      ) : !showForgot ? (
        <button
          type="button"
          onClick={() => setShowForgot(true)}
          className="mt-6 text-sm text-green-600 hover:text-green-700 font-bold underline underline-offset-2"
        >
          忘记 PIN？
        </button>
      ) : (
        <div className="mt-6 w-full max-w-xs p-4 bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-green-200 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">通过安全问题验证</p>
          {questionLabel ? (
            <>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-2">{questionLabel}</p>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => { setSecurityAnswer(e.target.value); setForgotError(''); }}
                placeholder="请输入答案"
                className="w-full p-3 rounded-xl border border-green-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-green-400"
              />
              {forgotError && <p className="mt-2 text-xs text-red-500">{forgotError}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleForgotSubmit}
                  className="flex-1 py-2 bg-green-500 text-white font-bold rounded-xl text-sm disabled:opacity-60"
                  disabled={isVerifyingAnswer}
                >
                  {isVerifyingAnswer ? '验证中...' : '验证'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setSecurityAnswer(''); setForgotError(''); }}
                  className="flex-1 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold rounded-xl text-sm"
                >
                  返回
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">未设置安全问题，无法通过此方式找回。</p>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold rounded-xl text-sm"
              >
                返回
              </button>
            </>
          )}
        </div>
      )}
      
    </div>
  );
};

export default LockScreen;
