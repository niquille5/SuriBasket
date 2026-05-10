# Suribasket

Suribasket is een lokale webapp voor productprijzen, prijschecks en warung-begrotingen. De frontend gebruikt HTML, CSS en JavaScript. De backend gebruikt Express en MySQL.

## Projectstructuur

```text
sranan-prijsscanner
|-- backend
|   |-- db.js
|   |-- db-query.js
|   |-- package.json
|   |-- server.js
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
    |   `-- style.css
    |-- js
    |   |-- app.js
    |   `-- layout.js
```

## Backend starten

Maak eerst een `.env` bestand in de backend map. Je kunt `backend/.env.example` kopieren en je eigen databasegegevens invullen.

Voor login en rollen gebruikt de backend ook `ADMIN_USERNAME`, `ADMIN_PASSWORD` en `JWT_SECRET` uit `.env`.

```powershell
cd C:\Users\user\sranan-prijsscanner\backend
npm start
```

De website en API draaien daarna op:

```text
http://localhost:3000
```

## Frontend openen

Gebruik bij voorkeur:

```text
http://localhost:3000
```

De hoofdwebsite start op `http://localhost:3000` met de loginpagina. Het dashboard staat op `http://localhost:3000/index.html`. Pagina's zoals `/producten.html`, `/scanner.html`, `/begroting.html` en `/over.html` staan direct in de frontend map.

## Belangrijke API endpoints

- `/api/health`
- `/api/summary`
- `/api/products`
- `/api/prices`
- `/api/official-products`
- `/api/cheapest/:product`
- `/api/check-price/:product/:price`
- `/api/login`
- `/api/me`
- `/api/admin/overview`

`/api/admin/overview` is beveiligd. De gebruiker moet eerst inloggen en een admin-token meesturen.

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
