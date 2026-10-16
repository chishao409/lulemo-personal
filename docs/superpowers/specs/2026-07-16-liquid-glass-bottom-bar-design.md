# Liquid Glass Bottom Bar Design

## Goal

Add an optional Android-only liquid glass floating bottom bar inspired by BiliPai's bottom navigation style, while preserving the current React/Capacitor page structure, navigation behavior, and WebView fallback.

The feature should be disabled by default. When enabled on Android, it should feel close to BiliPai's native liquid glass bottom bar, including continuous indicator movement while the user swipes between pages. On unsupported platforms or failing devices, the app should keep using the current Web bottom bar.

## References And Constraints

- BiliPai uses a custom Jetpack Compose bottom bar built around liquid glass/backdrop effects. It is a useful behavior and visual reference, but its source should not be copied because the project is GPL-3.0.
- AndroidLiquidGlass is Apache-2.0 and suitable as the native visual effect dependency.
- AndroidLiquidGlass provides low-level backdrop/glass APIs, not a ready-made high-level bottom bar component. The app will need its own original component.
- The current project is React + Vite + Capacitor. The primary app content runs inside a Capacitor WebView, so native backdrop sampling is less direct than in a full Compose app.
- The project has recently fixed Android WebView animation shadow artifacts. This feature must be guarded so it does not reintroduce similar visual defects.

## Architecture

Use a native enhancement layer over the existing Web app:

- Keep the current React views, horizontal swipe track, page state, and navigation logic.
- Add an Android native `ComposeView` overlay attached above the Capacitor WebView, positioned as a floating bottom bar.
- Build an original Compose liquid glass bottom bar component using AndroidLiquidGlass.
- Add a small Web-to-native bridge that syncs selected page, swipe progress, theme state, and feature enablement.
- Hide the existing Web bottom bar only after the Android layer reports that it is ready.
- Keep the Web bottom bar visible for browsers, desktop previews, PWA usage, unsupported devices, or native initialization failure.

This keeps the feature isolated: React remains responsible for app state and page transitions, while Android is responsible for the optional visual navigation shell.

## Android Integration Constraints

The current Android project is a Capacitor app with a Java `MainActivity`. It does not currently have Kotlin or Compose wired into the app module. The first implementation plan must therefore include a contained Android build setup step:

- Add Kotlin and Jetpack Compose support only to the Android app module.
- Keep the existing Capacitor `BridgeActivity` lifecycle intact.
- Attach the native overlay from the existing activity/layout rather than rehosting the Capacitor WebView.
- Choose an AndroidLiquidGlass version compatible with the project's Gradle, Android Gradle Plugin, Kotlin, Compose compiler, `minSdk`, `compileSdk`, and Java target.
- Verify debug and release builds. Release minification is already enabled, so the first implementation must pass `assembleRelease` and include any required R8/Proguard keep rules for Compose, AndroidLiquidGlass, and Capacitor plugin classes.
- Avoid broad Android build modernization unless it is required for Compose compatibility.

## Interaction Sync

Represent the current page as a continuous normalized position:

- `0` means calendar.
- `1` means statistics.
- `2` means settings.
- Values between integers represent in-progress swipes, such as `0.42` or `1.75`.

Web-to-native updates:

- During existing page swipes, Web calculates the continuous position and sends it to Android.
- Android moves the liquid glass indicator continuously from that value.
- On completed navigation, Web sends the settled index.

Native-to-Web updates:

- Tapping a native bottom-bar item sends the target index to Web.
- Web calls the existing navigation function instead of creating a new native navigation path.
- If native drag support is added later, Android sends continuous position updates and a final target index, while Web still owns the actual page transition.

Loop prevention:

- Bridge messages include a source/origin marker.
- Web-originated position updates should not be echoed back as new Web navigation requests.
- Native-originated taps should be treated as intent, then reconciled with the Web-confirmed final state.

## Bridge Contract

Use a dedicated Capacitor plugin, tentatively named `LiquidGlassBottomBar`, so the native feature is isolated from unrelated Android code.

Web calls native:

- `getCapability()` returns whether native liquid glass is available, the supported feature version, and any reason it cannot be enabled.
- `configure({ enabled, theme, labels, icons, selectedIndex, position, visible, interactive, requestId })` creates, updates, hides, or removes the native bar.
- `setPosition({ position, selectedIndex, source, requestId })` sends continuous swipe position and settled index.
- `setVisibility({ visible, interactive, reason, requestId })` controls whether the native bar is shown and whether it can receive touches.
- `dispose({ requestId })` removes the overlay and releases native resources.

Native emits Web events:

- `ready` when the native overlay is initialized and safe for Web to hide its own bottom bar.
- `unavailable` when the feature cannot be used, with a reason string for logging or a concise toast.
- `navigate` when the user taps a native item, carrying the target index. Web responds by calling the existing `navigateToView`.
- `positionIntent` only if native drag support is added later, carrying a continuous position.
- `error` when the native layer fails after initialization. Web restores the original bottom bar.

All messages should include `requestId` where applicable and a `source` field for updates that can flow in both directions. Web remains the source of truth for final page state.

## Overlay Visibility Rules

Because the native `ComposeView` sits above the WebView, Web must explicitly control when it is visible and interactive.

The native bottom bar should be hidden or non-interactive when:

- splash or loading gates are visible,
- lock screen or privacy gate is active,
- detail modal, record sheet, confirmation modal, date picker, background editor, export/import modal, or similar Web overlays are open,
- keyboard or focused text input would be obstructed by the native dock,
- a temporary full-screen or modal workflow needs the Web layer to own all touches.

The overlay should intercept only its own bottom-bar bounds. Touches outside the floating dock area must continue to reach the WebView so existing page gestures and scroll behavior are not affected.

## Settings

Add a lightweight setting under `SettingsView` -> "外观与体验":

- Label: `液态玻璃悬浮底栏`
- Default: off.
- Search keywords should include `液态玻璃`, `底栏`, `导航`, `悬浮`.
- The setting is persisted in `localStorage`.
- On non-Android environments, the option can remain visible as an appearance setting, but enabling it should not hide the existing Web bottom bar unless native capability is reported.

The setting should be compact and consistent with existing toggles. It should not become a large new settings panel.

## Fallback And Failure Handling

The current Web bottom bar is the authoritative fallback.

Fallback should happen when:

- The app is not running in Android Capacitor.
- The native plugin or bridge is unavailable.
- AndroidLiquidGlass initialization fails.
- The native overlay reports an unsupported device/runtime.
- Runtime errors occur in the native bottom bar.
- Performance or visual validation shows obvious WebView artifact risk.

When fallback happens:

- Restore the Web bottom bar immediately.
- Remove or hide the native overlay.
- Keep app navigation usable.
- Show at most one concise user-facing notice if needed.

## Visual Direction

The target is a BiliPai-like floating segmented liquid glass dock:

- Rounded floating capsule above the Android gesture area.
- Three navigation items matching the current app sections.
- A glass indicator that moves continuously with page swipes.
- Subtle refraction, blur, highlight, and depth.
- Active item should feel selected without making inactive items hard to read.
- Colors should respect the current app theme and avoid fighting with custom backgrounds.

The first implementation may use a staged visual target:

1. Native floating dock renders and syncs correctly.
2. Indicator movement matches swipe position in real time.
3. Liquid glass/backdrop sampling is added and tested.
4. If full WebView backdrop sampling is unstable, degrade to a close native glass approximation while keeping the toggle experimental/off by default.

## WebView Backdrop Strategy

Native liquid glass over a Capacitor WebView is the main technical risk.

Preferred feasibility route:

- Use an Android native `ComposeView` overlay for the bottom bar.
- Try a controlled backdrop strategy that can sample or approximate the WebView content behind the bottom dock.
- If direct Compose `LayerBackdrop` cannot reliably sample the WebView, evaluate a constrained `CanvasBackdrop`-style approach using a bottom-strip WebView snapshot or cached visual approximation.
- Cap update frequency if snapshotting is needed, especially during page swipes.
- The first releasable version must not depend on continuous real-time WebView screenshots. It can ship with a native glass approximation if sync, touch behavior, and fallback are stable.
- Enable snapshot-based backdrop sampling only after device testing shows no obvious dropped frames, battery drain, or WebView shadow artifacts.
- If snapshot refresh is used, define an explicit frame budget and fall back automatically when refresh cost exceeds that budget.

Avoid as the first route:

- Rehosting the whole Capacitor WebView inside Compose `AndroidView`, because that risks Capacitor lifecycle, plugin, keyboard, back handling, and WebView rendering regressions.
- Copying BiliPai's implementation directly, because of license and architectural differences.

## Testing Plan

Web tests:

- Setting defaults to off.
- Setting persists across reload.
- Search can find the new setting.
- Web bottom bar remains visible outside Android native capability.
- Web bottom bar hides only after native-ready acknowledgement.

Bridge tests or source tests:

- Web sends normalized page position while swiping.
- Web sends settled index after navigation.
- Native-originated tap requests call existing navigation.
- Origin markers prevent feedback loops.

Android verification:

- Build succeeds with the native dependency.
- App launches on emulator and physical Android device.
- Toggle can enable and disable the native overlay.
- Swipe between calendar/statistics/settings moves the indicator continuously.
- Tapping native items switches pages through existing Web logic.
- Lock screen, detail modal, record sheet, confirmation modal, date picker, keyboard, and background editor hide or disable the native bottom bar correctly.
- The native overlay only intercepts the bottom dock area and does not block other WebView gestures.
- Rotation, keyboard, modal, and Android back interactions remain stable.
- No recurrence of Android WebView black-shadow artifacts during page transitions.

Performance checks:

- Swipe remains responsive with the feature enabled.
- Native overlay does not visibly lag behind Web page movement.
- Battery or frame cost from backdrop sampling remains acceptable.

## Rollout

Implement behind the off-by-default setting.

The feature should be treated as an experimental Android visual enhancement until real-device verification confirms:

- no navigation regressions,
- no obvious performance issues,
- no WebView shadow artifacts,
- acceptable BiliPai-like visual quality.

If feasibility fails, keep the code path disabled and fall back to either the current Web bottom bar or a lighter WebView-based glass style in a later design.
