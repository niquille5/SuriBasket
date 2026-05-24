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

`users`  
Bevat eindgebruikers en admins. Het echte wachtwoord wordt niet opgeslagen; alleen de veilige hash staat in `password_hash`. Met `role` wordt bepaald of iemand een gewone gebruiker of admin is.

`purchases`  
Bevat afgeronde of bewaarde aankopen/inkoopregistraties van gebruikers. Deze tabel is logisch wanneer een gebruiker producten koopt of een inkoopgeschiedenis wil bewaren.

`shopping_lists`
Bevat begrotings- of boodschappenlijsten die een ingelogde gebruiker bewaart.

`shopping_list_items`
Bevat de producten binnen zo een bewaarde lijst, met aantal en geschatte prijs.

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

Een gebruiker kan meerdere aankopen of inkoopregistraties hebben:

```text
users.user_id -> purchases.user_id
```

Een gebruiker kan meerdere boodschappenlijsten bewaren:

```text
users.user_id -> shopping_lists.user_id
```

Een boodschappenlijst heeft meerdere productregels:

```text
shopping_lists.list_id -> shopping_list_items.list_id
```

Een aankoop hoort bij een product:

```text
products.product_id -> purchases.product_id
```

Een aankoop kan verwijzen naar een publieke prijsregel:

```text
official_product_prices.official_price_id -> purchases.official_price_id
```

## Gebruikers

Eindgebruikers worden opgeslagen in de tabel `users`.

De tabel gebruikt `password_hash` in plaats van `password`, omdat wachtwoorden niet als gewone tekst opgeslagen mogen worden.

De kolom `role` bepaalt of iemand een gewone gebruiker of admin is:

```text
user  = gewone eindgebruiker
admin = beheerder
```

De `shopping_lists` en `shopping_list_items` tabellen bewaren een begroting per gebruiker. De `purchases` tabel wordt gebruikt wanneer een gebruiker die lijst als afgeronde inkoop of inkoopgeschiedenis opslaat.

## SQL Voor Users En Purchases

```sql
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchases (
  purchase_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  official_price_id INT,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price) STORED,
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method ENUM('cash', 'card', 'transfer') DEFAULT 'cash',
  status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (official_price_id) REFERENCES official_product_prices(official_price_id)
);

CREATE TABLE shopping_lists (
  list_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  list_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE shopping_list_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  list_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL,
  estimated_price DECIMAL(10,2),
  FOREIGN KEY (list_id) REFERENCES shopping_lists(list_id)
);
```
