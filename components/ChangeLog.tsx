import React, { useEffect, useRef, useState } from 'react';
import FaIcon from './FaIcon';

interface Props {
  onClose: () => void;
  darkMode: boolean;
}

const ChangeLog: React.FC<Props> = ({ onClose, darkMode }) => {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (typeof window !== 'undefined') {
      closeTimerRef.current = window.setTimeout(() => {
        onClose();
      }, 360);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const changes = [
    {
      version: '1.6.3',
      date: '2026-07-16',
      title: 'WebDAV 云备份与 Android 动画稳定性修复',
      items: [
        '🆕 新增：WebDAV 云备份功能，支持配置服务器地址、账号密码与远程目录',
        '🆕 新增：备份数据可直接上传到 WebDAV 云端，并同步生成 latest 最新备份文件',
        '🆕 新增：WebDAV 云端导入能力，支持从 latest 备份或云端备份列表中恢复数据',
        '🆕 新增：Android 原生 WebDAV 请求支持，提升 PROPFIND、MKCOL、上传与下载在移动端的可用性',
        '✨ 优化：WebDAV 设置默认折叠展示，配置完成后减少常驻占用空间',
        '✨ 优化：云端备份列表改为弹窗选择，降低设置页信息密度',
        '✨ 优化：WebDAV 功能接入设置页搜索，可通过关键词快速定位云备份配置',
        '✨ 优化：WebDAV 远程目录不存在时支持自动创建，减少手动配置成本',
        '✨ 优化：详情弹窗切换渲染稳定性，减少 Android WebView 动画过程中的异常阴影残留',
        '✨ 优化：记录页、补录页与日历页之间的过渡表面更加稳定，避免动画过程中背景层被异常采样',
        '✨ 优化：整理 Android WebView 动画阴影风险点，沉淀后续可继续优化的位置与方案',
        '✅ 修复：自定义背景图链接文本被选中后切换页面，可能导致页面异常位移或左右滑动失效的问题',
        '✅ 修复：从补录页完成记录并切换到记录页时，Android 端偶发黑色阴影闪块的问题',
        '✅ 修复：记录页切换到补录页时，底部操作按钮过渡阶段偶发阴影闪烁的问题',
        '✅ 修复：删除最后一条记录并返回日历页时，过渡动画中可能出现阴影闪烁的问题',
        '✅ 修复：更新日志头部图标在浅色模式下显示不清晰的问题',
      ]
    },
    {
      version: '1.6.2',
      date: '2026-03-15',
      title: '补录增强、背景编辑与交互体验升级',
      items: [
        '🆕 新增：自定义背景图二级编辑页，上传图片或使用链接后不再直接保存，而是先进入预览与调整流程',
        '🆕 新增：背景图拖拽定位能力，可直接在预览区拖拽画面，调整背景主体显示位置',
        '🆕 新增：背景图缩放能力，支持通过缩放滑杆放大或缩小背景图，适配不同尺寸与构图的图片',
        '🆕 新增：背景图快速定位与微调能力，支持默认、居中、底部定位以及上下左右小步调整',
        '🆕 新增：背景图配置模型，支持保存图片源、水平位置、垂直位置与缩放比例，并兼容旧版仅保存 URL 的背景数据',
        '🆕 新增：主题模式三态切换，支持浅色模式、深色模式与跟随系统',
        '🆕 新增：补录页时长记录能力，支持快捷时长选择与自定义分钟数输入',
        '🆕 新增：补录页观看影片记录能力，支持记录“是否观看影片”',
        '🆕 新增：补录页影片类型记录能力，支持日韩、欧美、国产、动漫、其他与自定义类型',
        '🆕 新增：补录页自定义影片类型输入能力，满足个性化记录需求',
        '🆕 新增：记录卡片信息扩展展示，已保存记录可直接显示本次时长与影片观看类型',
        '🆕 新增：记录删除二次确认机制，先进入待删除状态，再点击删除按钮才真正删除',
        '🆕 新增：背景图编辑页退场动画与延迟关闭逻辑，避免二级页关闭时直接瞬切消失',
        '🆕 新增：subpage shell / panel 二级页动效体系，统一设置页子页面的进出场反馈与层级感',
        '✨ 优化：主页面背景渲染方式，改为使用统一的背景配置渲染，确保设置页预览与实际显示一致',
        '✨ 优化：背景图编辑流程，从原本的普通弹窗升级为更完整的二级编辑页，头部、内容区与底部操作区层级更清晰',
        '✨ 优化：背景图编辑页与横向切页手势的协作，进入编辑态后单独锁定横滑，减少编辑过程中误触切页',
        '✨ 优化：背景图编辑页已有内容的二次编辑体验，已有背景图可直接重新进入编辑页继续调整位置与缩放',
        '✨ 优化：详情弹窗列表页与补录页的切换方式，恢复横向位移反馈，并同步标题、副标题与返回按钮的过渡',
        '✨ 优化：详情弹窗整体高度、安全区与内容分布，补录页切换时的上抬过程更平滑，减少视觉割裂感',
        '✨ 优化：详情弹窗补录页布局，头部、内容区与底部提交区域的层级更稳定，小屏设备下浏览与填写更顺手',
        '✨ 优化：详情弹窗底部动作区视觉表现，列表页与补录页统一改为渐变玻璃背板，降低纯白遮罩感',
        '✨ 优化：详情弹窗在空状态、有记录状态、补录状态下的布局分配，提升小屏设备上的可读性与可操作性',
        '✨ 优化：长按日期详情与补录录入之间的动效连续性，减少页面切换时的断裂感',
        '✨ 优化：数据管理相关弹窗进出场节奏，遮罩、弹层与内容层的反馈更统一',
        '✨ 优化：Android 返回键处理逻辑，优先关闭弹窗、二级页与子层级页面，再执行页面返回或退出',
        '✨ 优化：背景图编辑页、详情弹窗与设置页内部层级切换的反馈一致性，整体交互更接近正常 App 的层级返回逻辑',
        '✅ 修复：记录删除图标未出现时，点击对应区域仍可能误删记录的问题',
        '✅ 修复：背景图编辑页关闭时横滑锁释放与状态清理时序不稳定的问题',
        '✅ 修复：背景图编辑页关闭时缺少退场反馈、页面直接切换的问题',
        '✅ 修复：详情弹窗列表页与补录页切换时，内容运动节奏与弹窗壳层运动不一致的问题',
        '✅ 修复：详情弹窗在空记录场景下底部操作区被裁切、下沉或直接不可见的问题',
        '✅ 修复：详情弹窗底部“完成记录”区域存在纯白背板遮罩、视觉割裂的问题',
        '✅ 修复：详情弹窗在部分高度策略下出现内容层与弹窗壳层运动不同步的问题',
        '✅ 修复：背景图编辑页关闭时二级页面状态未完整回收，导致后续交互反馈异常的问题',
        '✅ 修复：从列表页进入补录页时，标题区、返回按钮与主体内容切换反馈不一致的问题',
        '✅ 修复：部分小屏设备上详情弹窗内容区域与底部操作区分布异常的问题',
        '🧪 暂存问题：在“自定义背景图链接输入框”中输入长链接后，点击输入框外，再次长按输入框内链接文本，仍可能出现页面异常位移；该问题在禁用左右滑动时可规避，但当前仍需在保留左右滑页能力的前提下继续专项修复',
      ]
    },
    {
      version: '1.6.1',
      date: '2026-02-18',
      title: '本轮改动汇总（安全、离线、稳定性）',
      items: [
        '🆕 新增：PIN 防爆破机制（失败次数限制 + 30 秒临时锁定），并持久化锁定状态',
        '🆕 新增：设置页“访问官网”入口，支持跳转 https://lulemo-web.pages.dev/',
        '🆕 新增：背景图链接可用性检测流程（协议校验、加载校验、候选后缀探测）',
        '✨ 优化：品牌命名统一为 lulemo，并补充旧 key 到新 key 的兼容迁移',
        '✨ 优化：PIN 与安全问题答案改为哈希存储，移除“忘记 PIN 直接展示原 PIN”逻辑',
        '✨ 优化：localStorage 清理策略由 clear() 改为仅清理应用自身 key',
        '✨ 优化：CSV 导入导出健壮性（转义、解析增强、按 id 去重）',
        '✨ 优化：统计页与设置页改为懒加载 + 空闲预加载，降低主包压力',
        '✨ 优化：移除 Font Awesome CDN / Tailwind CDN / Google Fonts 远程依赖，收敛运行时外链请求',
        '✨ 优化：移除 importmap 远程映射，进一步降低第三方请求暴露面',
        '✨ 优化：Android 状态栏与安全区适配，修复顶部重叠显示问题',
        '✨ 优化：日历日期选择弹层层级，修复错层与遮挡问题',
        '✨ 优化：锁定后数字键反馈交互，避免不可输入时仍出现按下变色',
        '✅ 修复：底部 Tab 左右滑动切换在 Android WebView 中失效的问题，回退到 1.6.0 稳定手势模型并保留输入区防误触保护',
        '✅ 修复：默认背景图策略异常，调整为远程默认背景图并保留上传/链接自定义能力',
        '✅ 修复：导出与分享链路在 Android 侧可用性问题（目录策略调整为 Documents/lulemo）',
        '🧪 暂存问题：在“输入链接 -> 点击输入框外 -> 长按链接文本”路径下，仍可能触发页面异常，已标记继续专项修复',
      ]
    },
    {
      version: '1.6.0',
      date: '2026-02-08',
      title: '设置中心重构、贤者模式完善与解锁体验升级',
      items: [
        '✨ 新增：贤者模式完整冷却流程，打卡后进入倒计时，冷却结束前禁止再次打卡',
        '✨ 新增：贤者模式总开关（默认开启），可在设置中随时启用/关闭',
        '✨ 新增：贤者模式时长自定义（分钟输入 + 5/15/30/60 快捷档位）',
        '✨ 新增：主打卡按钮在贤者模式期间切换为闹钟倒计时动画与剩余时间显示',
        '✨ 新增：生物识别解锁（与 PIN 联动），支持设备可用性检测与状态提示',
        '✨ 新增：PIN 设置时可选启用安全问题，并支持通过安全问题重置 PIN',
        '✨ 新增：安全问题独立弹层选择器与过渡动画，支持遮罩关闭',
        '✨ 新增：设置页顶部搜索功能，支持关键词快速定位配置项',
        '✨ 新增：设置页一键“全部展开/全部收起”控制',
        '✨ 新增：版本信息外链跳转（GitHub）',
        '✨ 优化：设置页信息架构重组为安全/行为/外观/数据分组，降低信息噪音',
        '✨ 优化：关于模块独立展示，不再折叠，提升可达性',
        '✨ 优化：更新日志弹窗开关动画节奏，过渡更平滑连贯',
        '✨ 优化：日历选择器采用全局遮罩策略，统一跨页面压暗体验',
        '✨ 优化：全局遮罩加入背景模糊，并将日期选择器改为 Portal 渲染，修复层级冲突',
        '✨ 优化：设置页关于卡片升级为毛玻璃风格（半透明 + blur + 高光边界）',
        '✨ 优化：外观区“打卡图标/背景图”预览规格统一（同尺寸、同对齐、同间距）',
        '✅ 修复：设置页安全问题弹窗错位到统计页、暗黑模式不完整等层级与主题问题',
        '✅ 修复：设置页部分文案与提示词不准确（找回/重置等）',
        '✅ 修复：设置页面乱码（编码不一致导致），统一为 UTF-8 后恢复正常显示',
        '✅ 修复：外观区默认占位图标与标题缺失问题',
      ]
    },
    {
      version: '1.5.0',
      date: '2026-01-30',
      title: '统计热力图、PIN 安全与主题过渡',
      items: [
        '✨ 新增：统计页打卡热力图，支持按年/按月切换，六档图例（0～5+ 次）',
        '✨ 新增：PIN 码设置时可选安全问题，忘记 PIN 时通过验证可查看 PIN 或重置',
        '✨ 新增：设置页自定义背景图（上传图片或粘贴链接）',
        '✨ 优化：暗黑模式切换改为整页逐渐过渡（0.5s linear），去除圆形遮罩',
        '✨ 优化：选择日期弹窗内滑动年月列表时阻止误触左右滑动',
        '✨ 优化：打开日期选择时打卡按钮逐渐缩小隐藏，关闭后逐渐显示',
        '✨ 优化：长按打卡进度条改为 requestAnimationFrame 驱动，修复中途卡顿掉帧',
        '✨ 优化：打卡图标与进度环动画采用线性、匀速，更符合大厂 UI 规范',
        '✅ 修复：补录「今天」时记录时间错误（00:00:00）的问题',
        '✅ 修复：DetailModal 列表排序不修改 props 原数组',
        '✨ 优化：常量与 getLocalDateString 抽离至 constants，统一 PIN/导出 Key',
      ]
    },
    {
      version: '1.4.4',
      date: '2026-01-27',
      title: '日历交互优化与UI改进',
      items: [
        '✨ 新增：日历选择器支持按年份和月份快速跳转，可直接跳转到任意日期',
        '✅ 修复：空白日期（无记录）无法点击新建记录的问题',
        '✨ 优化：统一所有日期的点击交互，简化用户操作流程',
        '✨ 优化：DetailModal中的提示文本从"写点什么吗？"改为"🦌后感"',
        '✨ 优化：版本号统一更新至1.4.4（package.json、Android versionCode/versionName、Settings界面）',
      ]
    },
    {
      version: '1.4.3',
      date: '2026-01-25',
      title: '导出功能重构 & 时区问题修复',
      items: [
        '✅ 修复：CSV 导出在 Android WebView 中无法工作的问题',
        '✨ 新增：使用 Capacitor Filesystem API 实现原生文件保存',
        '✨ 新增：导出文件自动保存到 Download/lululu 文件夹',
        '✨ 新增：独立的"分享文件"功能，支持分享已导出的数据',
        '✨ 优化：Toast 提示支持多行显示和向上滑入动画',
        '✅ 修复：打卡日期与实际时间不匹配的时区问题（UTC → 本地时间）',
        '✨ 优化：导出失败时自动回退到 Cache 目录',
      ]
    },
    {
      version: '1.4.2',
      date: '2026-01-25',
      title: '滑动交互与统计页稳定性修复',
      items: [
        '✨ 新增：底部导航支持左右滑动切换（拖动跟随 + 松手切换）',
        '✅ 修复：统计页面"一言"在半拖状态下频繁跳动的问题（useMemo 缓存）',
        '✨ 优化：将组件注释改为中文，提升可读性（StatsView）',
        '✨ 新增：应用鹿主题图标（🦌 SVG 设计，覆盖各密度 Android mipmap）',
        '✨ 优化：版本号升级至 1.4.2，同步 Android versionCode、versionName、package.json',
      ]
    },
    {
      version: '1.4.0',
      date: '2026-01-25',
      title: '音效系统优化 & 启动性能改进',
      items: [
        '✅ 修复：关闭打卡反馈音时，打卡仍有音效的问题',
        '✅ 修复：添加自定义音效后，打卡仍播放原音效的问题',
        '✅ 优化：音效缓存机制，防止重复创建Audio对象',
        '✅ 修复：应用启动时年龄询问页面闪屏的问题',
        '✅ 优化：启动性能，直接从localStorage初始化状态',
      ]
    },
    {
      version: '1.3.4',
      date: '2026-01-20',
      title: '初始版本发布',
      items: [
        '✨ 核心打卡功能',
        '✨ 日历视图和统计分析',
        '✨ 自定义打卡图标和音效',
        '✨ PIN 码隐私保护',
        '✨ 黑暗模式支持',
      ]
    },
  ];

  const CHANGE_ITEM_ICONS = ['✅', '✨', '🆕', '🧪'] as const;
  const getChangeItemIcon = (item: string) => CHANGE_ITEM_ICONS.find((icon) => item.startsWith(icon)) ?? '✨';
  const getChangeItemText = (item: string) => {
    const icon = CHANGE_ITEM_ICONS.find((token) => item.startsWith(token));
    return icon ? item.slice(icon.length).trimStart() : item;
  };

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm ${
        isClosing ? 'animate-changelog-fade-out' : 'animate-changelog-fade-in'
      } ${darkMode ? 'dark' : ''}`}
      onClick={requestClose}
    >
      <div
        className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-green-100 dark:border-slate-800 max-h-[80vh] overflow-y-auto ${
          isClosing ? 'animate-changelog-sheet-out' : 'animate-changelog-sheet-in'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-700 border border-emerald-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:bg-green-900/50 dark:text-green-400 dark:border-green-700/40 dark:shadow-none">
              <FaIcon name="scroll" className="text-sm" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">更新日志</h2>
          </div>
          <button
            onClick={requestClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <FaIcon name="xmark" className="text-sm" />
          </button>
        </div>

        {/* Changes List */}
        <div className="space-y-6">
          {changes.map((change, index) => (
            <div
              key={index}
              className="pb-6 border-b border-gray-100 dark:border-slate-800 last:border-b-0 last:pb-0"
            >
              {/* Version Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
                    v{change.version}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {change.date}
                  </span>
                </div>
              </div>

              {/* Version Title */}
              <h3 className="font-bold text-gray-800 dark:text-slate-200 mb-3">
                {change.title}
              </h3>

              {/* Change Items */}
              <ul className="space-y-2">
                {change.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed flex gap-2"
                  >
                    <span className="flex-shrink-0 w-4 text-green-600 dark:text-green-400">
                      {getChangeItemIcon(item)}
                    </span>
                    <span>{getChangeItemText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={requestClose}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors active:scale-95"
          >
            关闭
          </button>
        </div>
      </div>

      <style>{`
        @keyframes changelogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes changelogFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes changelogSheetIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes changelogSheetOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(12px) scale(0.97); }
        }
        .animate-changelog-fade-in {
          animation: changelogFadeIn 0.34s ease-out forwards;
        }
        .animate-changelog-fade-out {
          animation: changelogFadeOut 0.28s ease-in forwards;
        }
        .animate-changelog-sheet-in {
          animation: changelogSheetIn 0.42s cubic-bezier(0.2, 0.85, 0.2, 1) forwards;
        }
        .animate-changelog-sheet-out {
          animation: changelogSheetOut 0.34s ease-in forwards;
        }
      `}</style>
    </div>
  );
};

export default ChangeLog;
