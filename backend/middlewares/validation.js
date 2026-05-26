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

// Generic request validation middleware used by route files.
// The schema is an array of rule functions that validate req.body.
function validateRequest(schema) {
  return validateBody(schema);
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

const validationSchemas = {
  register: [usernameRule(), passwordRule()],
  login: [
    requiredText("username", "Gebruikersnaam"),
    requiredText("password", "Wachtwoord")
  ],
  feedback: [
    ratingRule(),
    emailRule(),
    requiredText("message", "Bericht")
  ],
  adminUserCreate: [
    usernameRule(),
    passwordRule(),
    roleRule()
  ],
  adminUserUpdate: [
    optionalUsernameRule(),
    optionalPasswordRule(),
    roleRule()
  ],
  adminFeedbackUpdate: [
    optionalEnumRule("status", ["new", "reviewed", "responded", "archived"], "Status"),
    optionalEnumRule("priority", ["low", "medium", "high", "urgent"], "Prioriteit")
  ]
};

const validateRegister = validateRequest(validationSchemas.register);
const validateLogin = validateRequest(validationSchemas.login);
const validateFeedback = validateRequest(validationSchemas.feedback);
const validateAdminUserCreate = validateRequest(validationSchemas.adminUserCreate);
const validateAdminUserUpdate = validateRequest(validationSchemas.adminUserUpdate);
const validateAdminFeedbackUpdate = validateRequest(validationSchemas.adminFeedbackUpdate);

module.exports = {
  validateAdminFeedbackUpdate,
  validateAdminUserCreate,
  validateAdminUserUpdate,
  validateFeedback,
  validateLogin,
  validateRequest,
  validationSchemas,
  validateRegister
};
