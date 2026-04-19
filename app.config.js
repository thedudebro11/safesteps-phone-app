const base = require("./app.json");

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...base.expo,
  newArchEnabled: true,
  android: {
    ...base.expo.android,
    edgeToEdgeEnabled: true,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
};
