
import React from 'react';
import FaIcon from './FaIcon';

interface Props {
  onConfirm: () => void;
}

const SplashScreen: React.FC<Props> = ({ onConfirm }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F1F8E9] forest-bg p-8 text-center">
      <div className="mb-8 animate-bounce">
        <span className="text-8xl">🦌</span>
      </div>
      <h1 className="text-4xl font-bold text-green-800 mb-2">鹿了么</h1>
      <p className="text-lg text-green-700 mb-12">记录你的小秘密，追踪健康习惯</p>
      
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-xl w-full max-w-xs border border-green-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">年龄确认</h2>
        <p className="text-sm text-gray-600 mb-6">本应用包含成人内容。您是否年满18岁？</p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            是，我已满18岁
          </button>
          <button 
            onClick={() => window.location.href = 'https://www.google.com'}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors"
          >
            否，退出
          </button>
        </div>
      </div>
      
      <div className="mt-12 text-xs text-green-600 flex items-center gap-2 opacity-70">
        <FaIcon name="shield-halved" />
        <span>隐私第一，所有数据仅存储在本地</span>
      </div>
    </div>
  );
};

export default SplashScreen;
