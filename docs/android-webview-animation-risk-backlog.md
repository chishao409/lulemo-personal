# Android WebView 动画阴影闪烁风险清单

日期：2026-07-16

状态：仅记录，暂不修改。

## 背景

DetailModal 在 Android WebView 中出现过动画过渡时的灰黑块/阴影闪烁问题。已验证的高风险组合主要是：

- 退出动画中的 `transform` / `opacity`
- 大面积阴影，例如 `shadow-2xl`、彩色 `shadow-*`
- `will-change: transform, opacity, filter`
- 半透明背景、`backdrop-blur`
- Android WebView 对上述组合进行合成层栅格化时，可能短暂露出灰黑纹理或背景采样块

当前文档用于记录其它可能存在相同风险的位置。暂不执行这些优化，等后续确认需要时再逐项处理。

## 已验证修复思路

参考 DetailModal 的处理方式：

1. 不改动画逻辑、不改状态流、不改关闭时序。
2. 保留 `transform` / `opacity` 动画本身。
3. 移除动画 sheet 外壳上的大阴影，例如 `shadow-2xl`。
4. 移除动画元素上的 `will-change`。
5. 对参与退出动画的内部主按钮，移除彩色阴影，保留颜色过渡。
6. 对参与过渡的 chrome 区域，优先使用不透明背景，减少半透明 blur 采样。

## 高风险区域

### 1. DataDialog 通用弹窗

位置：

- `styles.css`
  - `.data-dialog-sheet`
  - `.data-dialog-sheet-out`
- `App.tsx`
  - 导出确认弹窗
  - 暂无数据弹窗
  - WebDAV 云端备份选择弹窗
  - WebDAV 导入确认弹窗
  - 清除全部数据确认弹窗
  - 移除 PIN 确认弹窗

风险点：

- `.data-dialog-sheet` / `.data-dialog-sheet-out` 使用了 `will-change: transform, opacity, filter`
- 多个弹窗 sheet 使用 `shadow-2xl`
- 多个主按钮使用 `shadow-lg shadow-*-500/*`
- 外层有 backdrop 动画，sheet 自身也有退出动画

未来建议：

- 移除 `.data-dialog-sheet` 和 `.data-dialog-sheet-out` 中的 `will-change`
- 将各 DataDialog sheet 的 `shadow-2xl` 移除或改为更轻的静态边界表现
- 将弹窗主按钮的彩色阴影移除，保留 `transition-colors` 或 `active:scale`
- 不修改 `data-dialog-sheet-in/out` 的 keyframes、时长和关闭逻辑

## 中高风险区域

### 2. SettingsView 安全问题选择器

位置：

- `components/SettingsView.tsx`
  - `showSecurityQuestionPicker`
  - `animate-picker-sheet`
  - `animate-picker-sheet-out`

风险点：

- 弹窗 sheet 使用 `shadow-2xl`
- 外层使用 `backdrop-blur-sm`
- sheet 关闭时有 `opacity + transform` 动画

未来建议：

- 移除安全问题选择器 sheet 上的 `shadow-2xl`
- 保留 `animate-picker-sheet-out` 动画本身
- 如仍有闪烁，再考虑降低外层 backdrop blur，但优先不要动动画

### 3. SettingsView AppAlert 弹窗

位置：

- `components/SettingsView.tsx`
  - `alertState.open`
  - `animate-appalert-sheet-in`
  - `animate-appalert-sheet-out`

风险点：

- 弹窗 sheet 使用 `shadow-2xl`
- 外层使用 `backdrop-blur-sm`
- sheet 关闭时有 `opacity + transform` 动画

未来建议：

- 移除 AppAlert sheet 上的 `shadow-2xl`
- 保留 `animate-appalert-sheet-out` 动画本身
- 不改 `closeAppAlert` 逻辑

## 中风险区域

### 4. ChangeLog 更新日志弹窗

位置：

- `components/ChangeLog.tsx`
  - 弹窗 sheet
  - `animate-changelog-sheet-in`
  - `animate-changelog-sheet-out`

风险点：

- sheet 使用 `shadow-2xl`
- 外层使用 `backdrop-blur-sm`
- 更新日志内容较长，关闭时可能增加重绘负担

未来建议：

- 移除 ChangeLog sheet 上的 `shadow-2xl`
- 保留更新日志弹窗的进出场动画
- 不修改当前更新日志内容

### 5. Subpage 二级页面动画

位置：

- `styles.css`
  - `.subpage-panel-in`
  - `.subpage-panel-out`
- 主要关联设置页二级页面，例如背景图编辑、WebDAV 云备份弹窗/面板等

风险点：

- `.subpage-panel-in/out` 使用 `will-change: transform, opacity, filter`
- 二级页面内部存在半透明、blur、阴影类 UI

未来建议：

- 移除 `.subpage-panel-in` 和 `.subpage-panel-out` 中的 `will-change`
- 保留二级页面 `transform + opacity` 动画
- 不改横向滑动或返回逻辑

## 低风险区域

这些位置存在半透明、blur 或阴影，但多数不是退出动画 sheet，风险较低，暂不建议主动处理：

- `components/StatsView.tsx` 的静态统计卡片
- `components/CalendarView.tsx` 的日历卡片和日期选择器
- `components/LockScreen.tsx` 的锁屏按钮和提示区
- `components/SettingsView.tsx` 的普通设置卡片、WebDAV 配置卡片、背景图预览卡片
- `App.tsx` 的主布局外壳、底部导航栏、普通 toast

未来只有在真机复现闪灰块时再处理，避免过度削弱整体视觉。

## 建议修复顺序

1. 先处理 `DataDialog`：影响范围最大，复用最多。
2. 再处理 `SettingsView` 的安全问题选择器和 AppAlert。
3. 再处理 `ChangeLog`。
4. 最后评估 `subpage-panel` 的 `will-change`。

## 验证建议

每次只处理一个区域，避免无法判断是哪项修复生效。

建议验证命令：

```bash
npm run typecheck
npm test
npm run build
npm run android:sync
```

Android 侧建议继续执行：

```bash
cd android
.\gradlew.bat :app:assembleDebug
```

真机重点观察：

- 弹窗关闭回到主界面时是否出现灰黑块
- 弹窗按钮从按下到关闭过程中是否出现局部阴影闪烁
- 二级页面返回设置页时是否出现背景采样块
- 深色模式下是否出现更明显的灰块
