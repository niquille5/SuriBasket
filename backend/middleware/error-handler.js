const { sendDatabaseError } = require("../utils/api-response");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  sendDatabaseError(res);
}

module.exports = errorHandler;
