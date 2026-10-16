<div align="center">
  <img src="./icon.svg" width="120" alt="Lulemo Logo" />
  <h1>鹿了么 (Lulemo)</h1>
  <p>记录你的小秘密，追踪健康习惯</p>

  <p>
    <img src="https://img.shields.io/badge/version-1.6.3-22c55e" alt="version" />
    <img src="https://img.shields.io/badge/platform-Android%20%7C%20Web-16a34a" alt="platform" />
    <img src="https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Capacitor-0ea5e9" alt="stack" />
  </p>
</div>

一个以隐私优先为核心的本地打卡应用，支持日历视图、年度统计、热力图、PIN 锁与生物识别解锁、CSV 导入导出等能力。

## 目录

- [功能亮点](#features)
- [实机截图](#screenshots)
- [技术栈](#tech-stack)
- [快速开始](#quickstart)
- [Android 构建与运行](#android)
- [隐私与数据说明](#privacy)
- [项目结构](#structure)
- [更新记录](#changelog)
- [贡献指南](#contributing)

<a id="features"></a>
## 功能亮点

- 年龄确认与启动引导，首次进入流程更清晰。
- 日历打卡主页，支持按日查看与快速补录。
- 统计页支持年度趋势图与按年/按月热力图切换。
- 设置中心支持搜索、分组折叠、更新日志查看。
- PIN 锁定 + 安全问题 + 生物识别解锁（设备支持时）。
- 贤者模式（冷却模式）可配置时长，避免短时间重复打卡。
- 数据管理支持 CSV 导出、导入与分享。
- 外观与体验可配置：深色模式、自定义图标、背景、音效。

<a id="screenshots"></a>
## 实机截图

> 以下展示对应你提供的 4 张实机演示图。
> 建议将图片放到 `docs/screenshots/` 目录并使用下列文件名，以确保 README 在 GitHub 正常渲染。

<table>
  <tr>
    <td align="center">
      <img src="./docs/screenshots/01-age-check.jpg" width="240" alt="年龄确认页" />
      <br />
      <sub>年龄确认页</sub>
    </td>
    <td align="center">
      <img src="./docs/screenshots/02-calendar-home.jpg" width="240" alt="日历打卡主页" />
      <br />
      <sub>日历打卡主页</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="./docs/screenshots/04-settings.jpg" width="240" alt="统计与热力图" />
      <br />
      <sub>统计与热力图</sub>
    </td>
    <td align="center">
      <img src="./docs/screenshots/03-stats-heatmap.jpg" width="240" alt="设置中心" />
      <br />
      <sub>设置中心</sub>
    </td>
  </tr>
</table>

<a id="tech-stack"></a>
## 技术栈

- 前端：React 19 + TypeScript
- 构建：Vite 6
- 移动端封装：Capacitor 6 (Android)
- 图表：Recharts
- 原生能力：Filesystem / Share / Native Biometric

<a id="quickstart"></a>
## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 本地开发

```bash
npm install
npm run dev
```

### 生产构建

```bash
npm run build
npm run preview
```

<a id="android"></a>
## Android 构建与运行

```bash
npm run build
npx cap sync android
npx cap open android
```

随后在 Android Studio 中运行或打包 APK/AAB。

<a id="privacy"></a>
## 隐私与数据说明

- 应用数据默认保存在本地（`localStorage`）。
- PIN 与安全问题答案已使用哈希方案存储（PBKDF2-SHA256）。
- 导出功能使用本地文件系统能力，不依赖云端后端。

<a id="structure"></a>
## 项目结构

```text
.
├─ components/         # 页面与核心 UI 组件
├─ utils/              # 工具模块（如 biometric、secret）
├─ android/            # Capacitor Android 工程
├─ App.tsx             # 应用主入口与状态编排
├─ constants.ts        # 常量与本地存储 key
├─ types.ts            # 类型定义
└─ vite.config.ts      # Vite 配置
```

<a id="changelog"></a>
## 更新记录

- 当前版本：`1.6.3`
- 详细变更：应用内「更新日志」弹窗（`components/ChangeLog.tsx`）

<a id="contributing"></a>
## 贡献指南

1. Fork 本仓库并新建分支。
2. 提交改动并补充必要说明。
3. 发起 Pull Request。

---

## License

本项目采用 [MIT License](./LICENSE)。
