const { sendBadRequest } = require("../utils/api-response");
const {
  cleanRole,
  isValidPassword,
  isValidUsername
} = require("../utils/validators");

function validateBody(rules) {
  return (req, res, next) => {
    const errors = rules
      .map((rule) => rule(req.body || {}))
      .filter(Boolean);

    if (errors.length) {
      sendBadRequest(res, errors.join(" "));
      return;
    }

    next();
  };
}

function requiredText(field, label) {
  return (body) => {
    const value = String(body[field] || "").trim();
    return value ? null : `${label} is verplicht.`;
  };
}

function usernameRule(field = "username") {
  return (body) => {
    const username = String(body[field] || "").trim();
    return isValidUsername(username)
      ? null
      : "Gebruikersnaam moet 3 tot 100 tekens bevatten.";
  };
}

function optionalUsernameRule(field = "username") {
  return (body) => {
    const username = String(body[field] || "").trim();
    return !username || isValidUsername(username)
      ? null
      : "Gebruikersnaam moet 3 tot 100 tekens bevatten.";
  };
}

function passwordRule(field = "password") {
  return (body) => {
    return isValidPassword(body[field])
      ? null
      : "Wachtwoord moet minimaal 6 tekens bevatten.";
  };
}

function optionalPasswordRule(field = "password") {
  return (body) => {
    return !body[field] || isValidPassword(body[field])
      ? null
      : "Wachtwoord moet minimaal 6 tekens bevatten.";
  };
}

function roleRule(field = "role") {
  return (body) => {
    return cleanRole(body[field]) ? null : "Rol moet user of admin zijn.";
  };
}

function optionalEnumRule(field, allowedValues, label) {
  return (body) => {
    const value = String(body[field] || "").trim();
    return !value || allowedValues.includes(value)
      ? null
      : `${label} heeft een ongeldige waarde.`;
  };
}

function ratingRule(field = "rating") {
  return (body) => {
    const rating = Number(body[field]);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5
      ? null
      : "Beoordeling moet tussen 1 en 5 zijn.";
  };
}

function emailRule(field = "email") {
  return (body) => {
    const email = String(body[field] || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? null
      : "Vul een geldig e-mailadres in.";
  };
}

const validateRegister = validateBody([usernameRule(), passwordRule()]);
const validateLogin = validateBody([
  requiredText("username", "Gebruikersnaam"),
  requiredText("password", "Wachtwoord")
]);
const validateFeedback = validateBody([
  ratingRule(),
  emailRule(),
  requiredText("message", "Bericht")
]);
const validateAdminUserCreate = validateBody([
  usernameRule(),
  passwordRule(),
  roleRule()
]);
const validateAdminUserUpdate = validateBody([
  optionalUsernameRule(),
  optionalPasswordRule(),
  roleRule()
]);
const validateAdminFeedbackUpdate = validateBody([
  optionalEnumRule("status", ["new", "reviewed", "responded", "archived"], "Status"),
  optionalEnumRule("priority", ["low", "medium", "high", "urgent"], "Prioriteit")
]);

module.exports = {
  validateAdminFeedbackUpdate,
  validateAdminUserCreate,
  validateAdminUserUpdate,
  validateFeedback,
  validateLogin,
  validateRegister
};
