# Suri Basket

Suri Basket is een lokale webapp voor productprijzen, prijschecks, feedback en warung-begrotingen. De frontend gebruikt HTML, CSS en JavaScript. De backend gebruikt Node.js, Express en MySQL.

## Belangrijkste functies

- Productprijzen bekijken, filteren en vergelijken.
- Prijscheck uitvoeren voor een product en ingevoerde prijs.
- Begrotingen maken en opslaan per gebruiker.
- Favorieten en prijsalerts gebruiken voor producten.
- Feedback sturen en alle ratings zichtbaar maken in de feedbacksectie.
- Adminomgeving voor database-overzicht, feedbackbeheer en gebruikersbeheer.

## Projectstructuur

```text
Suri Basket
|-- backend
|   |-- config
|   |   |-- auth.js
|   |   |-- db.js
|   |   `-- db-query.js
|   |-- controllers
|   |   |-- admin-controller.js
|   |   |-- auth-controller.js
|   |   |-- favorite-controller.js
|   |   |-- feedback-controller.js
|   |   |-- feedback-data.js
|   |   |-- list-controller.js
|   |   |-- price-alert-controller.js
|   |   |-- product-controller.js
|   |   |-- system-controller.js
|   |   `-- user-data.js
|   |-- middleware
|   |   |-- auth.js
|   |   `-- error-handler.js
|   |-- routes
|   |   |-- admin-routes.js
|   |   |-- auth-routes.js
|   |   |-- favorite-routes.js
|   |   |-- feedback-routes.js
|   |   |-- list-routes.js
|   |   |-- page-routes.js
|   |   |-- price-alert-routes.js
|   |   |-- product-routes.js
|   |   `-- system-routes.js
|   |-- utils
|   |   |-- api-response.js
|   |   |-- timeout.js
|   |   `-- validators.js
|   |-- package.json
|   |-- server.js
|   `-- scripts
|-- database
|   |-- README.md
|   |-- feedback.sql
|   |-- sranan_prijs_scanner.sql
|   `-- users_purchases.sql
`-- frontend
    |-- css
    |   |-- style.css
    |   |-- main.css
    |   |-- products.css
    |   |-- scanner.css
    |   |-- budget.css
    |   |-- feedback.css
    |   |-- login.css
    |   `-- admin.css
    |-- img
    |   |-- Background login.png
    |   |-- Logo loginpage.png
    |   |-- Suribasket_logo.png
    |   `-- frontpage.jpeg
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
    |   |-- budget-shared.js
    |   |-- feedback.js
    |   |-- login.js
    |   `-- admin.js
    `-- pages
        |-- index.html
        |-- producten.html
        |-- scanner.html
        |-- begroting.html
        |-- feedback.html
        |-- login.html
        `-- admin.html
```

## Backend starten

Maak eerst een `.env` bestand in de backend map. Je kunt `backend/.env.example` kopieren en je eigen databasegegevens invullen.

Voor login en rollen gebruikt de backend ook deze waarden uit `.env`:

```text
ADMIN_USERNAME=
ADMIN_PASSWORD=
JWT_SECRET=
```

Normaal starten:

```powershell
cd C:\Users\user\sranan-prijsscanner\backend
npm start
```

Tijdens ontwikkelen:

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

Open de HTML-bestanden niet rechtstreeks met `file:///...`. Via `file://` kan de frontend de API-routes zoals `/api/prices` niet goed bereiken.

Beschikbare pagina's:

- `http://localhost:3000/login.html`
- `http://localhost:3000/index.html`
- `http://localhost:3000/producten.html`
- `http://localhost:3000/scanner.html`
- `http://localhost:3000/begroting.html`
- `http://localhost:3000/feedback.html`
- `http://localhost:3000/admin.html`

## API endpoints

Publiek:

- `GET /api/health`
- `GET /api/summary`
- `GET /api/products`
- `GET /api/prices`
- `GET /api/official-products`
- `GET /api/cheapest/:product`
- `GET /api/check-price/:product/:price`
- `POST /api/register`
- `POST /api/login`
- `POST /api/feedback`
- `GET /api/feedback/stats`

Ingelogde gebruiker:

- `GET /api/me`
- `GET /api/shopping-lists`
- `POST /api/shopping-lists`
- `POST /api/purchases`
- `GET /api/favorites`
- `POST /api/favorites/add`
- `DELETE /api/favorites/remove`
- `GET /api/favorites/check/:product_id`
- `GET /api/price-alerts`
- `POST /api/price-alerts`
- `GET /api/price-alerts/triggered`
- `DELETE /api/price-alerts/:alert_id`

Admin:

- `GET /api/admin/overview`
- `GET /api/admin/feedback`
- `PATCH /api/admin/feedback/:id`
- `DELETE /api/admin/feedback/:id`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`

Admin endpoints vereisen een geldige login met `role: "admin"`.

## Adminomgeving

De adminpagina ondersteunt:

- Database tellingen bekijken.
- Feedback/reacties bekijken, refreshen en verwijderen.
- Feedbackstatus aanpassen: `new`, `reviewed`, `responded`, `archived`.
- Feedbackprioriteit aanpassen: `low`, `medium`, `high`, `urgent`.
- Admin-reactie of interne notitie opslaan bij feedback.
- Gebruikers aanmaken via modal.
- Gebruikers bewerken via modal.
- Gebruikers verwijderen met bevestigingspopup.

Gebruikersbeheer is bewust veilig gehouden:

- Een admin kan zichzelf niet verwijderen.
- Een admin kan de eigen adminrol niet per ongeluk naar `user` wijzigen.
- Bij verwijderen worden gekoppelde lijsten, aankopen, favorieten en prijsalerts meegenomen.

## Feedback

De feedbackpagina toont reacties voor alle ratings van 1 tot en met 5 sterren. De nieuwste reacties staan bovenaan en oudere reacties blijven bereikbaar via een scrollbare lijst.

Screenshot-upload is verwijderd uit de feedbackflow.

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

## Tests

Backend syntax check:

```powershell
npm test --prefix backend
```

## Git workflow

Werk bij voorkeur per taak op een aparte branch:

```powershell
git switch main
git pull origin main
git switch -c feature-naam
```

Na wijzigingen:

```powershell
git status
git add .
git commit -m "Beschrijf de wijziging"
git push origin feature-naam
```

Maak daarna een pull request naar `main`.
