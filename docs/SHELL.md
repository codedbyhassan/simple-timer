# Application shell

Layout: side rail (left), top bar (search, connection, notifications, theme, account) and the content area. Glass (blur) exists only on the rail and the top bar, with a solid fallback where blur is unsupported. It is not exported from `@ui`.

## Navigation and access

- The rail shows the menus of the person's workspace (`src/core/access/navigation.js`). A menu shows when the person holds any one of its permissions. Items never appear disabled. People with more than one role get a workspace switcher at the top of the rail. The full list is in `product/ROLE_WORKSPACES.md`.
- Permission codes and role names come from the database blueprint (section 5). Each role starts on its workspace overview.
- Typing the URL of a workspace or menu you may not use shows a plain "no access" page.
- Production reads access from `api.my_access()`, returning `{ display_name, roles, permissions, department }`. The function is created in the database core migrations (M3). Until then, only the dev demo backend can sign in to the shell.
- Development: open any page with `?as=doctor` (or another role code) to switch the demo role.

## Top bar

- Search focuses with `/` and opens the shared search page (`/search?q=`).
- Connection chip shows Online, Reconnecting or Offline. For now it reports the network state. When the realtime layer lands (M6) it reports the channel and shows "Live" only while connected.
- Notification centre follows the policy in the dashboard spec section 5: important items add a badge and a quiet toast, critical items show a persistent strip until acknowledged, routine events never notify. Opening the list marks items read.
- Theme toggle and avatar menu (Settings, Profile, Log out).
- Break-glass access is not in the top bar yet. It needs patient context and arrives with Patient 360 (M5).

## Behaviour

- Every route change scrolls to the top.
- Collapsed or expanded rail is remembered per device.
- Desktop only. Minimum width 1100 px in the shell, 1366 x 768 is the design target.

## Tests

`tests/e2e/shell_flows.py` (84 checks): menus for all nine demo roles against the brief, role home pages, the workspace switcher, forbidden URLs, menu keyboard handling, theme sync, notifications and the critical strip, rail collapse and persistence, the `/` shortcut, offline chip, scroll to top, dark theme and the 1366 x 768 layout.
