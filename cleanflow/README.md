# CleanFlow — Instrukce pro nasazení

## Co potřebuješ
- Účet na [Railway.app](https://railway.app) (zdarma)
- Účet na [Netlify.com](https://netlify.com) (zdarma)
- GitHub účet

## Krok 1 — Nahraj kód na GitHub

1. Vytvoř nový repozitář na GitHub (např. `cleanflow`)
2. Nahraj složku `backend/` do repozitáře
3. Nahraj složku `frontend/` do repozitáře

## Krok 2 — Nasaď backend na Railway

1. Jdi na [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Vyber svůj repozitář, nastav **Root Directory** na `backend`
3. V sekci **Variables** přidej:
   ```
   MONGO_URL=mongodb+srv://apartment-sync-2:d8m6omb6p6ps739q3jjg@customer-apps.a012hh.mongodb.net/?appName=apartment-sync-2&maxPoolSize=5&retryWrites=true&timeoutMS=10000&w=majority
   SECRET_KEY=cleanflow-tajny-klic-2026
   ```
4. Railway automaticky nasadí backend. Zkopíruj si **URL backendu** (např. `https://cleanflow-backend.railway.app`)

## Krok 3 — Nasaď frontend na Netlify

1. V souboru `frontend/.env.production` nastav:
   ```
   REACT_APP_API_URL=https://cleanflow-backend.railway.app
   ```
2. Jdi na [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
3. Vyber repozitář, nastav:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
4. V **Environment variables** přidej:
   ```
   REACT_APP_API_URL=https://cleanflow-backend.railway.app
   ```
5. Deploy!

## Přihlašovací údaje

| Role | Uživatel | Heslo |
|------|----------|-------|
| Admin | Nikola | admin |
| Uklízečka | uklid | apartmany4u |

## iCal URL pro apartmány

Po přihlášení přidej apartmány s těmito URL:

| Apartmán | Booking.com | Airbnb |
|----------|-------------|--------|
| Apartmán s 1 ložnicí | `https://ical.booking.com/v1/export?t=3f039e63-4200-4571-b76a-bfcfa67f19d7` | `https://www.airbnb.cz/calendar/ical/1435552358723079171.ics?t=fe47e4235486492a8e01b13b1d74dd72` |
| Apartmán s 1 ložnicí a terasou | `https://ical.booking.com/v1/export?t=c8de237b-7079-490e-9e8c-3abda90fc29d` | `https://www.airbnb.cz/calendar/ical/1435491007157769047.ics?t=15fcd613358740f7aacb846ecc15bbb6` |
| Studio s balkónem | `https://ical.booking.com/v1/export?t=f152c04f-8f6a-43c6-b8a4-194d63372ec9` | — |
| Studio s terasou | `https://ical.booking.com/v1/export?t=d5bfa05b-fec2-4acf-b1b5-e8067c716bd0` | — |
| Letců 29 | `https://ical.booking.com/v1/export?t=13558f2b-07c0-4213-a656-b3607a044a95` | — |

## Proč synchronizace funguje

Backend používá `allorigins.win` proxy jako fallback když Booking.com nebo Airbnb blokují přímý přístup ze serveru. Logika:
1. Zkusí přímé stažení (rychlé)
2. Pokud selže (403), použije proxy automaticky

## Poznámky

- MongoDB URL je ze stávající Emergent databáze — všechna data zůstanou zachována
- WhatsApp notifikace jsou deep-linky (wa.me) — klikneš a otevře se WhatsApp s předvyplněnou zprávou
