const { query } = require("./db-query");

async function ensureFeedbackTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NULL,
      email VARCHAR(255) NOT NULL,
      rating TINYINT NOT NULL,
      message TEXT NOT NULL,
      page_visited VARCHAR(120) NULL,
      issue_type VARCHAR(80) NULL,
      browser_info TEXT NULL,
      referrer_url TEXT NULL,
      ip_address VARCHAR(64) NULL,
      user_agent TEXT NULL,
      status ENUM('new', 'reviewed', 'responded', 'archived') NOT NULL DEFAULT 'new',
      priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
      admin_response TEXT NULL,
      responded_by VARCHAR(255) NULL,
      responded_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_feedback_status (status),
      INDEX idx_feedback_priority (priority),
      INDEX idx_feedback_rating (rating),
      INDEX idx_feedback_created_at (created_at)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS feedback_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(80) NOT NULL UNIQUE,
      display_name VARCHAR(120) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS feedback_category_map (
      feedback_id INT NOT NULL,
      category_id INT NOT NULL,
      PRIMARY KEY (feedback_id, category_id),
      CONSTRAINT fk_feedback_category_map_feedback
        FOREIGN KEY (feedback_id) REFERENCES feedback(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_feedback_category_map_category
        FOREIGN KEY (category_id) REFERENCES feedback_categories(id)
        ON DELETE CASCADE
    )
  `);

  await query(`
    INSERT INTO feedback_categories (category_name, display_name)
    VALUES
      ('bug', 'Technische fout'),
      ('confusing', 'Onduidelijke layout'),
      ('slow', 'Laadt langzaam'),
      ('price', 'Prijs klopt niet'),
      ('other_issue', 'Iets anders')
    ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)
  `);
}

async function saveFeedback(feedback) {
  await ensureFeedbackTables();

  const priority = getPriority(feedback.rating, feedback.issueType);
  const result = await query(
    `
      INSERT INTO feedback
        (name, email, rating, message, page_visited, issue_type, browser_info, referrer_url, ip_address, user_agent, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      feedback.name || null,
      feedback.email,
      feedback.rating,
      feedback.message,
      feedback.page || null,
      feedback.issueType || null,
      feedback.browserInfo || null,
      feedback.referrer || null,
      feedback.ipAddress || null,
      feedback.userAgent || null,
      priority,
    ],
  );

  if (feedback.issueType) {
    await linkFeedbackCategory(result.insertId, feedback.issueType);
  }

  return result.insertId;
}

async function getFeedbackStats() {
  await ensureFeedbackTables();

  const [stats] = await query(`
    SELECT
      COUNT(*) AS total_feedback,
      ROUND(AVG(rating), 1) AS average_rating
    FROM feedback
  `);

  const testimonials = await query(`
    SELECT name, rating, message, created_at
    FROM feedback
    ORDER BY created_at DESC
    LIMIT 6
  `);

  return {
    stats: {
      total_feedback: stats.total_feedback || 0,
      average_rating: stats.average_rating || 0,
    },
    testimonials,
  };
}

async function getRecentFeedback(limit = 10) {
  await ensureFeedbackTables();

  return query(
    `
      SELECT
        id,
        name,
        email,
        rating,
        page_visited,
        issue_type,
        status,
        priority,
        message,
        admin_response,
        created_at
      FROM feedback
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [limit],
  );
}

async function updateFeedbackStatus(id, updates) {
  await ensureFeedbackTables();

  const allowedStatuses = ["new", "reviewed", "responded", "archived"];
  const allowedPriorities = ["low", "medium", "high", "urgent"];
  const status = allowedStatuses.includes(updates.status) ? updates.status : null;
  const priority = allowedPriorities.includes(updates.priority) ? updates.priority : null;
  const adminResponse = String(updates.admin_response || "").trim() || null;

  await query(
    `
      UPDATE feedback
      SET
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        admin_response = COALESCE(?, admin_response),
        responded_by = CASE WHEN ? IS NULL THEN responded_by ELSE ? END,
        responded_at = CASE WHEN ? IS NULL THEN responded_at ELSE NOW() END
      WHERE id = ?
    `,
    [
      status,
      priority,
      adminResponse,
      adminResponse,
      updates.responded_by || null,
      adminResponse,
      id,
    ],
  );
}

async function deleteFeedback(id) {
  await ensureFeedbackTables();
  await query("DELETE FROM feedback_category_map WHERE feedback_id = ?", [id]);
  await query("DELETE FROM feedback WHERE id = ?", [id]);
}

async function linkFeedbackCategory(feedbackId, categoryName) {
  const rows = await query(
    `
      SELECT id
      FROM feedback_categories
      WHERE category_name = ?
      LIMIT 1
    `,
    [categoryName],
  );

  if (!rows.length) return;

  await query(
    `
      INSERT IGNORE INTO feedback_category_map (feedback_id, category_id)
      VALUES (?, ?)
    `,
    [feedbackId, rows[0].id],
  );
}

function getPriority(rating, issueType) {
  if (Number(rating) <= 2) return "high";
  if (issueType === "bug" || issueType === "price") return "high";
  if (Number(rating) === 3) return "medium";
  return "low";
}

module.exports = {
  ensureFeedbackTables,
  getFeedbackStats,
  getRecentFeedback,
  saveFeedback,
  deleteFeedback,
  updateFeedbackStatus,
};
