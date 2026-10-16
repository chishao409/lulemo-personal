import { Capacitor } from '@capacitor/core';
import { BiometricAuthError, BiometryType, NativeBiometric } from '@capgo/capacitor-native-biometric';

export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType: BiometryType;
  errorCode?: number;
}

export const BIOMETRY_LABEL: Record<BiometryType, string> = {
  [BiometryType.NONE]: '生物识别',
  [BiometryType.TOUCH_ID]: 'Touch ID',
  [BiometryType.FACE_ID]: 'Face ID',
  [BiometryType.FINGERPRINT]: '指纹识别',
  [BiometryType.FACE_AUTHENTICATION]: '面部识别',
  [BiometryType.IRIS_AUTHENTICATION]: '虹膜识别',
  [BiometryType.MULTIPLE]: '生物识别',
};

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (Capacitor.getPlatform() === 'web') {
    return { isAvailable: false, biometryType: BiometryType.NONE };
  }

  try {
    const result = await NativeBiometric.isAvailable();
    return {
      isAvailable: !!result.isAvailable,
      biometryType: result.biometryType ?? BiometryType.NONE,
      errorCode: result.errorCode,
    };
  } catch {
    return { isAvailable: false, biometryType: BiometryType.NONE };
  }
}

export async function verifyBiometricIdentity(): Promise<{ ok: true } | { ok: false; canceled: boolean; message: string }> {
  try {
    await NativeBiometric.verifyIdentity({
      title: '生物识别验证',
      subtitle: '解锁鹿了么',
      description: '请验证身份以解锁应用',
      negativeButtonText: '使用 PIN',
      maxAttempts: 3,
    });
    return { ok: true };
  } catch (error: any) {
    const code = typeof error?.code === 'number' ? error.code : undefined;
    if (code === BiometricAuthError.USER_CANCEL || code === BiometricAuthError.USER_FALLBACK) {
      return { ok: false, canceled: true, message: '已取消生物识别' };
    }
    if (code === BiometricAuthError.BIOMETRICS_NOT_ENROLLED) {
      return { ok: false, canceled: false, message: '未录入生物信息，请先在系统中录入' };
    }
    if (code === BiometricAuthError.BIOMETRICS_UNAVAILABLE || code === BiometricAuthError.PASSCODE_NOT_SET) {
      return { ok: false, canceled: false, message: '设备未开启可用的生物识别能力' };
    }
    return { ok: false, canceled: false, message: '生物识别失败，请使用 PIN 解锁' };
  }
}
