# Payly Pro

Payly Pro is a private salary calculator for the browser and for Telegram Mini Apps. It keeps the Payly layout and adds a salary calendar, saved calculations, history, more currencies, and appearance settings.

This repository is separate from `payly-salary-calculator`. Nothing here changes that project, its `main` branch, GitHub Pages, or the existing Telegram demo.

GitHub Pages is **not** enabled. Do not publish a public demo until you decide to.

## What it does

- Hourly or monthly salary, with weekly, monthly, and annual results
- Annual income = weekly gross × 52. Monthly average = annual income ÷ 12
- Full precision inside the calculation. Amounts are rounded only when shown
- Example: $20/hour, 40 hours/week, tax 20% → weekly net $640.00, monthly net $2,773.33, annual net $33,280.00
- Currencies: USD, EUR, GBP, RUB, CAD, AUD, CHF, AED. Switching currency changes the symbol only. Amounts are not converted
- Save a calculation to a date: gross, tax, net, hours, and a note
- Salary calendar with marked days, edit, delete, and a monthly summary
- History of saved calculations
- Copy result
- English, Russian, French, and Arabic. Arabic uses right-to-left layout
- Light and dark mode
- Settings: app name, accent color, background (default, photo, or none)
- Everything stays in `localStorage` on the device. No database, no server, no paid API
- Do not put a Telegram bot token in this repository

## Files

- `index.html`
- `style.css`
- `app.js`
- `i18n.js`
- `money.js`
- `assets/payly-background.jpg`

Open `index.html` in a browser. Paths are relative, so the page also works if you later host the folder yourself.

Inside Telegram the page calls `Telegram.WebApp.ready()` and `Telegram.WebApp.expand()` when it is actually opened as a Mini App. A normal browser does not need Telegram.

## Русский

Payly Pro — отдельная версия калькулятора для продажи. Репозиторий `payly-salary-calculator` не изменялся.

GitHub Pages **не включён**. Публичную Demo не публикуйте, пока сами этого не решите.

Расчёты идут в браузере. Записи календаря, история, язык, тема и настройки хранятся только в `localStorage`. Токен бота в эти файлы подставлять нельзя.


## Payly Pro v1.1

- Save Calculation opens an editor with a date picker (defaults to today).
- Users can change the date before saving.
- Multiple saved calculations can coexist on the same date.
- Each History item opens and edits its own saved record.
- Calendar and monthly totals include all records saved for the month.
- Data remains local in `localStorage`; no backend is required.

### Payly Pro v1.2
- Calendar days with saved data now open a list of every entry for that date.
- Each saved entry can be opened and edited separately.
- `+ Add entry` creates another calculation for the selected date.
