USE sranan_prijs_scanner;

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
);

CREATE TABLE IF NOT EXISTS feedback_screenshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feedback_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_screenshots_feedback
    FOREIGN KEY (feedback_id) REFERENCES feedback(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
);

INSERT INTO feedback_categories (category_name, display_name)
VALUES
  ('bug', 'Bug'),
  ('feature_request', 'Feature request'),
  ('praise', 'Praise')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);
