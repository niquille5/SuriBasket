const { addFavorite, getFavorites, isFavorited, removeFavorite } = require("./user-data");
const {
  sendBadRequest,
  sendCreated,
  sendDatabaseError,
  sendForbidden,
  sendOk
} = require("../utils/api-response");

async function getUserFavorites(req, res) {
  try {
    const favorites = await getFavorites(req.user.user_id);
    sendOk(res, favorites);
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function getFavoritesByUser(req, res) {
  const requestedUserId = parseInt(req.params.user_id, 10);

  if (req.user.user_id !== requestedUserId && req.user.role !== "admin") {
    sendForbidden(res, "Geen toegang tot deze favorieten");
    return;
  }

  try {
    const favorites = await getFavorites(req.params.user_id);
    sendOk(res, favorites);
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function createFavorite(req, res) {
  const { product_id, product_name, category } = req.body;

  if (!product_id && !product_name) {
    sendBadRequest(res, "product_id of productnaam is vereist");
    return;
  }

  try {
    const favoriteProductId = await addFavorite(req.user.user_id, {
      product_id,
      product_name,
      category
    });
    sendCreated(res, {
      message: "Favoriet toegevoegd!",
      product_id: favoriteProductId
    });
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function deleteFavorite(req, res) {
  const { product_id, product_name } = req.body;

  if (!product_id && !product_name) {
    sendBadRequest(res, "product_id of productnaam is vereist");
    return;
  }

  try {
    await removeFavorite(req.user.user_id, { product_id, product_name });
    sendOk(res, { message: "Favoriet verwijderd!" });
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function checkFavorite(req, res) {
  try {
    const favorited = await isFavorited(req.user.user_id, req.params.product_id);
    sendOk(res, { favorited });
  } catch (err) {
    sendDatabaseError(res);
  }
}

module.exports = {
  checkFavorite,
  createFavorite,
  deleteFavorite,
  getFavoritesByUser,
  getUserFavorites
};
