/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => ({
  ...config,
  newArchEnabled: true,
  android: {
    ...config.android,
    edgeToEdgeEnabled: true,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
});
