const jwt = require("jsonwebtoken");
const { getAdminCredentials, getJwtSecret } = require("../config/auth");
const {
  createUser,
  ensureAdminUser,
  ensureUserTables,
  findUserByUsername,
  passwordMatches
} = require("./user-data");
const {
  sendBadRequest,
  sendConflict,
  sendCreated,
  sendDatabaseError,
  sendOk
} = require("../utils/api-response");
const { isValidPassword, isValidUsername } = require("../utils/validators");

async function register(req, res) {
  const { username, password } = req.body;
  const cleanUsername = String(username || "").trim();

  if (!isValidUsername(cleanUsername) || !isValidPassword(password)) {
    sendBadRequest(res, "Gebruik minimaal 3 tekens voor naam en 6 tekens voor wachtwoord");
    return;
  }

  try {
    await ensureUserTables();
    const user = await createUser(cleanUsername, password);
    sendCreated(res, createLoginResponse(user));
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      sendConflict(res, "Deze gebruikersnaam bestaat al");
      return;
    }

    sendDatabaseError(res);
  }
}

async function login(req, res) {
  const { username, password } = req.body;
  const cleanUsername = String(username || "").trim();

  if (!cleanUsername || !password) {
    sendBadRequest(res, "Vul gebruikersnaam en wachtwoord in");
    return;
  }

  try {
    await ensureUserTables();

    const { adminUsername, adminPassword } = getAdminCredentials();
    await ensureAdminUser(adminUsername, adminPassword);

    const user = await findUserByUsername(cleanUsername);
    const canLogin = user && (await passwordMatches(password, user.password_hash));

    if (!canLogin) {
      res.status(401).json({ message: "Ongeldige gebruikersnaam of wachtwoord" });
      return;
    }

    sendOk(res, createLoginResponse(user));
  } catch (err) {
    sendDatabaseError(res);
  }
}

function getMe(req, res) {
  sendOk(res, { user: req.user });
}

function createLoginResponse(user) {
  const safeUser = {
    user_id: user.user_id,
    username: user.username,
    role: user.role
  };

  return {
    token: jwt.sign(safeUser, getJwtSecret(), { expiresIn: "2h" }),
    user: safeUser
  };
}

module.exports = {
  getMe,
  login,
  register
};
