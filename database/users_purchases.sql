-- Uitbreiding voor eindgebruikers, boodschappenlijsten en inkoopgeschiedenis.
-- Gebruik dit bestand als de database al bestaat en je alleen deze extra
-- tabellen wilt toevoegen.

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites (
  favorites_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  UNIQUE KEY unique_user_product (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS purchases (
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

CREATE TABLE IF NOT EXISTS shopping_lists (
  list_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  list_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  list_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL,
  estimated_price DECIMAL(10,2),
  FOREIGN KEY (list_id) REFERENCES shopping_lists(list_id)
);
