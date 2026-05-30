const express = require("express");
const cors = require("cors");
const path = require("path");
const { assertProductionConfig } = require("./config/auth");
const errorHandler = require("./middlewares/error");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const favoriteRoutes = require("./routes/favorites");
const feedbackRoutes = require("./routes/feedback");
const listRoutes = require("./routes/lists");
const priceAlertRoutes = require("./routes/price-alerts");
const productRoutes = require("./routes/products");
const systemRoutes = require("./routes/system");
const createPageRouter = require("./routes/pages");

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
