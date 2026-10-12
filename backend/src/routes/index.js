const authRoutes = require('./auth');
const listingRoutes = require('./listings');
const sellerRoutes = require('./seller');
const managerRoutes = require('./manager');
const adminRoutes = require('./admin');
const tenantRoutes = require('./tenant');

module.exports = {
  authRoutes,
  listingRoutes,
  sellerRoutes,
  managerRoutes,
  adminRoutes,
  tenantRoutes,
};
