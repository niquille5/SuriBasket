# Suri Basket

Suri Basket is een lokale webapp voor productprijzen, prijschecks en warung-begrotingen. De frontend gebruikt HTML, CSS en JavaScript. De backend gebruikt Express en MySQL.

## Projectstructuur

```text
Suri Basket
|-- backend
|   |-- db.js
|   |-- db-query.js
|   |-- package.json
|   |-- server.js
|   |-- user-data.js
|   `-- scripts
`-- frontend
    |-- index.html
    |-- producten.html
    |-- scanner.html
    |-- begroting.html
    |-- over.html
    |-- login.html
    |-- admin.html
    |-- package.json
    |-- css
    |   |-- style.css
    |   |-- main.css
    |   |-- dashboard.css
    |   |-- products.css
    |   |-- scanner.css
    |   |-- budget.css
    |   |-- login.css
    |   |-- admin.css
    |   `-- about.css
    |-- js
    |   |-- app.js
    |   |-- layout.js
    |   |-- api.js
    |   |-- auth.js
    |   |-- dom.js
    |   |-- format.js
    |   |-- health.js
    |   |-- dashboard.js
    |   |-- products.js
    |   |-- scanner.js
    |   |-- budget.js
    |   |-- budget-data.js
    |   |-- budget-shared.js
    |   |-- login.js
    |   `-- admin.js
```

## Frontend indeling

`frontend/js/app.js` start alleen de layout, health check en de juiste pagina-module. Gedeelde functies staan in kleine bestanden zoals `api.js`, `dom.js`, `format.js` en `auth.js`. Pagina-eigen gedrag staat in bestanden met dezelfde naam als de pagina, bijvoorbeeld `scanner.js` voor `scanner.html`.

`frontend/css/style.css` is de centrale importlijst. Algemene layout en componenten staan in `main.css`; pagina-eigen styling staat in bestanden zoals `scanner.css`, `products.css` en `budget.css`.

## Backend starten

Maak eerst een `.env` bestand in de backend map. Je kunt `backend/.env.example` kopieren en je eigen databasegegevens invullen.

Voor login en rollen gebruikt de backend ook `ADMIN_USERNAME`, `ADMIN_PASSWORD` en `JWT_SECRET` uit `.env`.

Normaal starten:

```powershell
cd C:\Users\user\sranan-prijsscanner\backend
npm start
```

Tijdens ontwikkelen kun je nodemon gebruiken. Dan herstart de backend automatisch wanneer je backend-code wijzigt:

```powershell
cd C:\Users\user\sranan-prijsscanner\backend
npm run dev
```

De website en API draaien daarna op:

```text
http://localhost:3000
```

## Frontend openen

Open de app altijd via de backend server:

```text
http://localhost:3000
```

Open de HTML-bestanden niet rechtstreeks met `file:///C:/.../frontend/producten.html`. Via `file://` kan de frontend de API-routes zoals `/api/prices` niet goed bereiken. Via `http://localhost:3000` serveert Express de frontend en API samen.

De hoofdwebsite start op `http://localhost:3000` met de loginpagina. Het dashboard staat op `http://localhost:3000/index.html`. Pagina's zoals `/producten.html`, `/scanner.html`, `/begroting.html` en `/over.html` open je via dezelfde host, bijvoorbeeld `http://localhost:3000/producten.html`.

## Belangrijke API endpoints

- `/api/health`
- `/api/summary`
- `/api/products`
- `/api/prices`
- `/api/official-products`
- `/api/cheapest/:product`
- `/api/check-price/:product/:price`
- `/api/register`
- `/api/login`
- `/api/me`
- `/api/shopping-lists`
- `/api/purchases`
- `/api/admin/overview`

`/api/admin/overview` is beveiligd. De gebruiker moet eerst inloggen en een admin-token meesturen.
`/api/shopping-lists` bewaart begrotingslijsten per gebruiker. `/api/purchases` bewaart een afgeronde inkoopgeschiedenis.

## Database scripts

Publieke productenlijst importeren:

```powershell
cd C:\Users\user\sranan-prijsscanner\backend
npm run import:ez
```

Voedingsproducten naar de eigen database zetten:

```powershell
npm run sync:food
```

Publieke prijzen in de eigen database herstellen:

```powershell
npm run repair:public-local
```

## Begroting

De begroting zit op `frontend/begroting.html` en gebruikt richtprijzen uit de eigen database. Op de productenpagina staat ook een snellijst waarmee je producten direct kunt selecteren.
