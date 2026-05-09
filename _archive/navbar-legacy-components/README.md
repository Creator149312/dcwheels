# Archived: Navbar Legacy Components

**Archived**: May 9, 2026  
**Reason**: Dead code — neither component was imported anywhere in the active codebase.

---

## CoinComponent.js

A coin balance display widget from an early gamification/currency feature concept.

- Accepted a `coins` prop and animated border color on change
- Depended on `react-icons/fa` (`FaCoins`)
- **Never integrated** into Navbar or any layout shell

**Restore if**: Coins/rewards/gamification system is revived. Drop into Navbar's right section alongside `UserInfo`.

---

## NavLinks.js

An old-style dropdown mega-menu component using hardcoded `links` data from `./Mylinks`.

- Supported nested `submenu` + `sublinks` + `subHeading` state
- Used `heading` / `subHeading` state pattern for accordion-style mobile menus
- **Never integrated** — its data source `Mylinks.js` no longer exists
- Desktop nav is now handled directly in `Navbar.js` (Browse dropdown, explicit links)
- Mobile nav is now handled by `MobileNavChrome.js` (bottom nav + library sheet)

**Restore if**: A mega-menu with many top-level categories is needed again. Recreate `Mylinks.js` with the link data and import NavLinks into Navbar.
