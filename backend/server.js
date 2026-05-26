const express = require("express");
const cors = require("cors");
const path = require("path");
const { assertProductionConfig } = require("./config/auth");
const errorHandler = require("./middlewares/error-handler");
const adminRoutes = require("./routes/admin-routes");
const authRoutes = require("./routes/auth-routes");
const favoriteRoutes = require("./routes/favorite-routes");
const feedbackRoutes = require("./routes/feedback-routes");
const listRoutes = require("./routes/list-routes");
const priceAlertRoutes = require("./routes/price-alert-routes");
const productRoutes = require("./routes/product-routes");
const systemRoutes = require("./routes/system-routes");
const createPageRouter = require("./routes/page-routes");

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDir = path.resolve(__dirname, "../frontend");
const pagesDir = path.join(frontendDir, "pages");

assertProductionConfig();

app.use(cors());
app.use(express.json());

app.use(createPageRouter(pagesDir));
app.use(express.static(frontendDir));

app.use(systemRoutes);
app.use(authRoutes);
app.use(listRoutes);
app.use(feedbackRoutes);
app.use(adminRoutes);
app.use(productRoutes);
app.use(favoriteRoutes);
app.use(priceAlertRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
