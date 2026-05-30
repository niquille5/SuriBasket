const { ensureUserTables, getShoppingLists, saveBegrotingRecords, saveShoppingList } = require("./user-data");
const { sendBadRequest, sendCreated, sendDatabaseError, sendOk } = require("../utils/api-response");
const { cleanBegrotingRecordItems, cleanBudgetItems } = require("../utils/validators");

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

async function createBegrotingRecord(req, res) {
  const items = cleanBegrotingRecordItems(req.body.items);

  if (!items.length) {
    sendBadRequest(res, "Voeg eerst producten toe aan je begroting");
    return;
  }

  try {
    await ensureUserTables();
    await saveBegrotingRecords(req.user.user_id, items, req.body.payment_method);
    sendCreated(res, { message: "Begroting opgeslagen" });
  } catch (err) {
    sendDatabaseError(res);
  }
}

module.exports = {
  createBegrotingRecord,
  createList,
  getLists
};
