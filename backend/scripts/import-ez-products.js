const https = require("https");
const db = require("../config/db");

const SOURCE_URL = "https://ez.gov.sr/index.php?r=product%2Findex";
const SOURCE_NAME = "Publieke SRD Check productenlijst";
const WARUNG_CATEGORIES = [
  "Basisproducten",
  "Conserven",
  "Dranken",
  "Groente",
  "Olie",
  "Peulvruchten",
  "Specerij",
  "Vlees",
  "Voeding",
  "Zuivel"
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let html = "";
        res.on("data", (chunk) => {
          html += chunk;
        });
        res.on("end", () => resolve(html));
      })
      .on("error", reject);
  });
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results);
    });
  });
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(value) {
  const normalized = decodeHtml(value)
    .replace("SRD", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const amount = Number(normalized);
  return Number.isNaN(amount) ? null : amount;
}

function inferCategory(productName) {
  const name = productName.toLowerCase();

  if (name.includes("babyvoeding")) return "Babyvoeding";
  if (name.includes("luiers")) return "Verzorging";
  if (name.includes("maandverband")) return "Verzorging";
  if (name.includes("olie")) return "Olie";
  if (name.includes("sardien")) return "Conserven";
  if (name.includes("bonen") || name.includes("erwten")) return "Peulvruchten";
  if (name.includes("suiker") || name.includes("zout") || name.includes("gist")) return "Basisproducten";
  if (name.includes("aardappelen") || name.includes("uien") || name.includes("knoflook")) return "Groente";
  if (name.includes("thee")) return "Dranken";

  return "Algemeen";
}

function parseRows(html) {
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);

  if (!tbodyMatch) {
    return [];
  }

  return [...tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((rowMatch) => {
      const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
        decodeHtml(cell[1].replace(/<[^>]*>/g, ""))
      );

      if (cells.length < 7) {
        return null;
      }

      return {
        source_row_number: Number(cells[0]),
        product_name: cells[1],
        category: inferCategory(cells[1]),
        importer_name: cells[2],
        wholesale_package: cells[3],
        wholesale_price: parseMoney(cells[4]),
        retail_package: cells[5],
        retail_price: parseMoney(cells[6])
      };
    })
    .filter(Boolean);
}

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS importers (
      importer_id INT AUTO_INCREMENT PRIMARY KEY,
      importer_name VARCHAR(150) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS official_product_prices (
      official_price_id INT AUTO_INCREMENT PRIMARY KEY,
      source_name VARCHAR(150) NOT NULL,
      source_url VARCHAR(255) NOT NULL,
      source_row_number INT NOT NULL,
      product_name VARCHAR(150) NOT NULL,
      category VARCHAR(80),
      importer_id INT NOT NULL,
      wholesale_package VARCHAR(120),
      wholesale_price DECIMAL(10,2),
      retail_package VARCHAR(120),
      retail_price DECIMAL(10,2),
      imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_source_row (source_name, source_row_number),
      INDEX idx_official_product_name (product_name),
      INDEX idx_official_category (category),
      CONSTRAINT fk_official_importer
        FOREIGN KEY (importer_id) REFERENCES importers(importer_id)
    )
  `);
}

async function upsertImporter(importerName) {
  await query(
    "INSERT IGNORE INTO importers (importer_name) VALUES (?)",
    [importerName]
  );

  const rows = await query(
    "SELECT importer_id FROM importers WHERE importer_name = ? LIMIT 1",
    [importerName]
  );

  return rows[0].importer_id;
}

async function upsertOfficialPrice(row) {
  const importerId = await upsertImporter(row.importer_name);

  await query(
    `
      INSERT INTO official_product_prices (
        source_name,
        source_url,
        source_row_number,
        product_name,
        category,
        importer_id,
        wholesale_package,
        wholesale_price,
        retail_package,
        retail_price
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        product_name = VALUES(product_name),
        category = VALUES(category),
        importer_id = VALUES(importer_id),
        wholesale_package = VALUES(wholesale_package),
        wholesale_price = VALUES(wholesale_price),
        retail_package = VALUES(retail_package),
        retail_price = VALUES(retail_price),
        imported_at = CURRENT_TIMESTAMP
    `,
    [
      SOURCE_NAME,
      SOURCE_URL,
      row.source_row_number,
      row.product_name,
      row.category,
      importerId,
      row.wholesale_package,
      row.wholesale_price,
      row.retail_package,
      row.retail_price
    ]
  );
}

async function main() {
  await ensureSchema();

  const html = await fetchPage(SOURCE_URL);
  const rows = parseRows(html);

  const warungRows = rows.filter((row) => WARUNG_CATEGORIES.includes(row.category));

  for (const row of warungRows) {
    await upsertOfficialPrice(row);
  }

  console.log(`Imported ${warungRows.length} warung product rows from ${SOURCE_NAME}.`);
  db.end();
}

main().catch((err) => {
  console.error(err);
  db.end();
  process.exit(1);
});
