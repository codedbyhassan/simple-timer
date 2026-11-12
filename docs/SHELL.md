# Application shell

The application shell contains a role-aware side rail, top bar and content area. The app is local-first; it does not show a network connection state or claim remote synchronisation.

## Navigation and access

- Menus are derived from `src/core/access/navigation.js` and filtered by the selected local profile's role permissions.
- Local profiles are stored in IndexedDB. They provide frontend role navigation, not identity verification or secure authentication.
- Each built-in local profile has one role. Switching roles means signing out and selecting another profile.
- Direct navigation to a route outside the selected role's permissions displays the no-access page.
- No URL query parameter can impersonate a role.

## Top bar

- Global search opens `/search?q=` and searches local records.
- Notifications are stored in IndexedDB and remain available after reload.
- Important notifications can display a quiet toast. Critical notifications remain visible until acknowledged.
- Theme selection and rail collapse are device-local interface preferences.
- The account menu links to Settings, Profile and Log out.

## Behaviour

- Route changes return the content area to the top.
- Sidebar collapse preference is remembered in the current browser profile.
- The shell supports desktop, tablet and mobile widths. Tables may scroll within their own containers, but the page shell must not force horizontal overflow.
- The app remains usable offline because operational records are local.

## Tests

`tests/e2e/shell_flows.py` exercises local profile selection, role navigation, route access, local notifications, profile switching, theme behaviour, sidebar collapse, global search and viewport overflow. Run it against the local Vite server with Playwright installed.
