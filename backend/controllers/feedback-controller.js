const { getFeedbackStats, saveFeedback } = require("./feedback-data");
const { sendBadRequest, sendCreated, sendDatabaseError, sendOk } = require("../utils/api-response");
const { cleanFeedback } = require("../utils/validators");

async function createFeedback(req, res) {
  const feedback = cleanFeedback(req.body, req);

  if (!feedback) {
    res.status(400).json({
      success: false,
      message: "Vul een geldige beoordeling, e-mail en bericht in"
    });
    return;
  }

  try {
    const feedbackId = await saveFeedback(feedback);
    sendCreated(res, {
      success: true,
      feedback_id: feedbackId,
      message: "Feedback opgeslagen"
    });
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function getStats(req, res) {
  try {
    const data = await getFeedbackStats();
    sendOk(res, { success: true, ...data });
  } catch (err) {
    sendDatabaseError(res);
  }
}

module.exports = {
  createFeedback,
  getStats
};
