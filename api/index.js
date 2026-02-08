let appPromise;
let dbPromise;
let isConnected = false;

const getApp = () => {
  if (!appPromise) {
    appPromise = import("../server/src/app.js").then(
      (module) => module.default,
    );
  }
  return appPromise;
};

const ensureDb = () => {
  if (!dbPromise) {
    dbPromise = import("../server/src/config/db.js").then(
      async (module) => {
        if (!isConnected) {
          await module.default();
          isConnected = true;
          console.log("✅ MongoDB connected (serverless)");
        }
      },
    );
  }
  return dbPromise;
};

module.exports = async (req, res) => {
  await ensureDb();
  const app = await getApp();
  return app(req, res);
};
