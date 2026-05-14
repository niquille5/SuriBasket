# Suri Basket Database

Deze map bevat de database-export voor de app. Gebruik `sranan_prijs_scanner.sql` om dezelfde tabellen en voorbeelddata lokaal te importeren.

## Database Importeren

1. Open MySQL Workbench of phpMyAdmin.
2. Importeer `sranan_prijs_scanner.sql`.
3. Controleer dat de database `sranan_prijs_scanner` bestaat.
4. Zet deze databasegegevens in `backend/.env`.

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=jouw_mysql_wachtwoord
DB_NAME=sranan_prijs_scanner
JWT_SECRET=een_geheime_code
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## Tabellen

`products`  
Bevat de hoofdproducten, bijvoorbeeld rijst, olie, zout, uien en aardappelen.

`product_variants`  
Bevat de verpakking of variant van een product. Een product kan meerdere varianten hebben, zoals rijst van 4.5 kg en rijst van 9 kg.

`stores`  
Bevat winkels en publieke importeurs waar prijzen vandaan komen.

`prices`  
Bevat de prijs per productvariant per winkel. Dit is de tabel die de app gebruikt voor prijsvergelijking, begroting en de productenlijst.

`importers`  
Bevat importeurs uit de publieke SRD Check productenlijst.

`official_product_prices`  
Bevat de originele publieke prijsregels die zijn geimporteerd. Deze tabel bewaart ook broninformatie zoals bronlink, rij-nummer, groothandelprijs en kleinhandelprijs.

## Relaties Voor ERD

Een product heeft een of meer productvarianten:

```text
products.product_id -> product_variants.product_id
```

Een productvariant kan meerdere prijsmetingen hebben:

```text
product_variants.variant_id -> prices.variant_id
```

Een winkel kan meerdere prijsmetingen hebben:

```text
stores.store_id -> prices.store_id
```

Een importeur kan meerdere publieke prijsregels hebben:

```text
importers.importer_id -> official_product_prices.importer_id
```

## Gebruikers

In deze versie worden gewone eindgebruikers niet opgeslagen in de database. Zij gebruiken de app zonder account.

De admin-login wordt lokaal ingesteld via `backend/.env` met `ADMIN_USERNAME` en `ADMIN_PASSWORD`.

Als gebruikers later wel opgeslagen moeten worden, kan er een aparte tabel komen:

```text
users
- user_id
- username
- password_hash
- role
- created_at
```
