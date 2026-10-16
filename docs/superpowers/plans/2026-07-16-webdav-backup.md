# WebDAV Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add enhanced WebDAV backup: save configuration, upload timestamped CSV backups plus a latest copy, list cloud backups, and import selected backups.

**Architecture:** Keep WebDAV in a small utility module with injectable transport for tests and CapacitorHttp/fetch for runtime. App owns record serialization/import and SettingsView owns configuration UI and backup actions.

**Tech Stack:** React, TypeScript, CapacitorHttp, localStorage, Vitest.

---

### Task 1: WebDAV Utility

**Files:**
- Create: `utils/webdav.ts`
- Test: `tests/webdav.test.ts`

- [x] Write failing tests for config normalization, URL building, Basic auth headers, timestamped filename generation, PROPFIND parsing, upload latest + timestamped backups, and download selected file.
- [x] Run `npm test -- tests/webdav.test.ts` and confirm failures.
- [x] Implement `utils/webdav.ts` with injectable request transport.
- [x] Run `npm test -- tests/webdav.test.ts` and confirm pass.

### Task 2: Storage Keys and Types

**Files:**
- Modify: `constants.ts`
- Modify: `utils/appStorage.ts`
- Modify: `types.ts`

- [x] Add `WEBDAV_CONFIG_KEY`.
- [x] Add `WebDavConfig` and `WebDavBackupFile` types.
- [x] Add the WebDAV config key to app-owned cleanup keys.
- [x] Run `npm run typecheck`.

### Task 3: App Data Flow

**Files:**
- Modify: `App.tsx`

- [x] Load/save WebDAV config from localStorage.
- [x] Add handlers for saving config, testing connection, uploading backup, listing backups, and importing selected backup.
- [x] Reuse existing CSV serialization and import merge logic.
- [x] Add small confirmation dialog before importing from WebDAV.
- [x] Run `npm run typecheck`.

### Task 4: Settings UI

**Files:**
- Modify: `components/SettingsView.tsx`
- Modify: `components/FaIcon.tsx`

- [x] Add WebDAV props to SettingsView.
- [x] Add compact WebDAV cloud backup panel inside data management.
- [x] Add configuration fields: URL, username, password, directory.
- [x] Add controls: save, test, upload backup, refresh cloud list, import selected backup.
- [x] Add any needed Font Awesome icons already available in the dependency.
- [x] Run `npm run typecheck`.

### Task 5: Verification

- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Run `npm run android:sync`.
