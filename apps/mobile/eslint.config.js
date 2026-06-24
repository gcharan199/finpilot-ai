// Flat ESLint config for the Expo app. Extends Expo's flat config (React /
// React Native / hooks rules) and ignores generated + build output.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "expo-env.d.ts", "babel.config.js", "metro.config.js"],
  },
];
