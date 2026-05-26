function sendOk(res, data = {}) {
  res.json(data);
}

function sendCreated(res, data = {}) {
  res.status(201).json(data);
}

function sendBadRequest(res, message) {
  res.status(400).json({ message });
}

function sendUnauthorized(res, message = "Login vereist") {
  res.status(401).json({ message });
}

function sendForbidden(res, message = "Geen toegang") {
  res.status(403).json({ message });
}

function sendNotFound(res, message = "Niet gevonden") {
  res.status(404).json({ message });
}

function sendConflict(res, message) {
  res.status(409).json({ message });
}

function sendDatabaseError(res) {
  res.status(500).json({ error: "Database error" });
}

module.exports = {
  sendBadRequest,
  sendConflict,
  sendCreated,
  sendDatabaseError,
  sendForbidden,
  sendNotFound,
  sendOk,
  sendUnauthorized
};
