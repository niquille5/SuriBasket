const { query } = require("../config/db-query");
const { deleteFeedback, getRecentFeedback, updateFeedbackStatus } = require("./feedback-data");
const { createUser, deleteUser, getUsers, updateUser } = require("./user-data");
const {
  sendBadRequest,
  sendConflict,
  sendCreated,
  sendDatabaseError,
  sendOk
} = require("../utils/api-response");
const { cleanRole, isValidPassword, isValidUsername } = require("../utils/validators");

async function getOverview(req, res) {
  try {
    const [summary] = await query(`
      SELECT
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM product_variants) AS variants,
        (SELECT COUNT(*) FROM stores) AS stores,
        (SELECT COUNT(*) FROM prices) AS prices
    `);

    sendOk(res, {
      message: "Admin toegang actief",
      role: req.user.role,
      summary
    });
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function getAdminFeedback(req, res) {
  try {
    const feedback = await getRecentFeedback(12);
    sendOk(res, { feedback });
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function updateAdminFeedback(req, res) {
  const feedbackId = Number(req.params.id);

  if (!feedbackId) {
    sendBadRequest(res, "Ongeldig feedbacknummer");
    return;
  }

  try {
    await updateFeedbackStatus(feedbackId, {
      ...req.body,
      responded_by: req.user.username
    });
    sendOk(res, { message: "Feedback bijgewerkt" });
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function deleteAdminFeedback(req, res) {
  const feedbackId = Number(req.params.id);

  if (!feedbackId) {
    sendBadRequest(res, "Ongeldig feedbacknummer");
    return;
  }

  try {
    await deleteFeedback(feedbackId);
    sendOk(res, { message: "Feedback verwijderd" });
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function getAdminUsers(req, res) {
  try {
    const users = await getUsers();
    sendOk(res, { users });
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function createAdminUser(req, res) {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const role = cleanRole(req.body.role);

  if (!isValidUsername(username) || !isValidPassword(password) || !role) {
    sendBadRequest(res, "Gebruik minimaal 3 tekens voor naam, 6 voor wachtwoord en een geldige rol");
    return;
  }

  try {
    const user = await createUser(username, password, role);
    sendCreated(res, { user });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      sendConflict(res, "Deze gebruikersnaam bestaat al");
      return;
    }

    sendDatabaseError(res);
  }
}

async function updateAdminUser(req, res) {
  const userId = Number(req.params.id);
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const role = cleanRole(req.body.role);

  if (!userId || !isValidUsername(username) || !role) {
    sendBadRequest(res, "Ongeldige gebruiker of rol");
    return;
  }

  if (password && !isValidPassword(password)) {
    sendBadRequest(res, "Nieuw wachtwoord moet minimaal 6 tekens zijn");
    return;
  }

  if (userId === Number(req.user.user_id) && role !== "admin") {
    sendBadRequest(res, "Je kunt je eigen adminrol niet verwijderen");
    return;
  }

  try {
    await updateUser(userId, {
      username,
      role,
      password: password || null
    });
    sendOk(res, { message: "Gebruiker bijgewerkt" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      sendConflict(res, "Deze gebruikersnaam bestaat al");
      return;
    }

    sendDatabaseError(res);
  }
}

async function deleteAdminUser(req, res) {
  const userId = Number(req.params.id);

  if (!userId) {
    sendBadRequest(res, "Ongeldige gebruiker");
    return;
  }

  if (userId === Number(req.user.user_id)) {
    sendBadRequest(res, "Je kunt je eigen admin-account niet verwijderen");
    return;
  }

  try {
    await deleteUser(userId);
    sendOk(res, { message: "Gebruiker verwijderd" });
  } catch (err) {
    sendDatabaseError(res);
  }
}

module.exports = {
  createAdminUser,
  deleteAdminFeedback,
  deleteAdminUser,
  getAdminFeedback,
  getAdminUsers,
  getOverview,
  updateAdminFeedback,
  updateAdminUser
};
