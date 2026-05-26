const { ensureUserTables, getShoppingLists, savePurchases, saveShoppingList } = require("./user-data");
const { sendBadRequest, sendCreated, sendDatabaseError, sendOk } = require("../utils/api-response");
const { cleanBudgetItems, cleanPurchaseItems } = require("../utils/validators");

async function getLists(req, res) {
  try {
    await ensureUserTables();
    const lists = await getShoppingLists(req.user.user_id);
    sendOk(res, lists);
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function createList(req, res) {
  const items = cleanBudgetItems(req.body.items);

  if (!items.length) {
    sendBadRequest(res, "Voeg eerst producten toe aan je lijst");
    return;
  }

  try {
    await ensureUserTables();
    const listId = await saveShoppingList(req.user.user_id, req.body.list_name, items);
    sendCreated(res, { list_id: listId, message: "Lijst opgeslagen" });
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function createPurchase(req, res) {
  const items = cleanPurchaseItems(req.body.items);

  if (!items.length) {
    sendBadRequest(res, "Voeg eerst producten toe aan je inkoop");
    return;
  }

  try {
    await ensureUserTables();
    await savePurchases(req.user.user_id, items, req.body.payment_method);
    sendCreated(res, { message: "Inkoop opgeslagen" });
  } catch (err) {
    sendDatabaseError(res);
  }
}

module.exports = {
  createList,
  createPurchase,
  getLists
};
