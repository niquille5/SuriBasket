const { getPriceAlerts, removePriceAlert, savePriceAlert } = require("./user-data");
const { sendBadRequest, sendCreated, sendDatabaseError, sendOk } = require("../utils/api-response");

async function getAlerts(req, res) {
  try {
    const alerts = await getPriceAlerts(req.user.user_id);
    sendOk(res, alerts);
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function getTriggeredAlerts(req, res) {
  try {
    const alerts = await getPriceAlerts(req.user.user_id, {
      triggeredOnly: true
    });
    sendOk(res, alerts);
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function createAlert(req, res) {
  const targetPrice = Number(req.body.target_price);

  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    sendBadRequest(res, "Vul een geldige doelprijs in");
    return;
  }

  try {
    const alert = await savePriceAlert(req.user.user_id, {
      product_id: req.body.product_id,
      product_name: req.body.product_name,
      category: req.body.category,
      variant_id: req.body.variant_id,
      target_price: targetPrice
    });
    sendCreated(res, alert);
  } catch (err) {
    res.status(400).json({ message: "Prijsalert kon niet worden opgeslagen" });
  }
}

async function deleteAlert(req, res) {
  const alertId = Number(req.params.alert_id);

  if (!alertId) {
    sendBadRequest(res, "Ongeldige prijsalert");
    return;
  }

  try {
    await removePriceAlert(req.user.user_id, alertId);
    sendOk(res, { message: "Prijsalert verwijderd" });
  } catch (err) {
    sendDatabaseError(res);
  }
}

module.exports = {
  createAlert,
  deleteAlert,
  getAlerts,
  getTriggeredAlerts
};
