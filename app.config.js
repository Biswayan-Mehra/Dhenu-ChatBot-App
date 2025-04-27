import "dotenv/config";

export default {
  expo: {
    name: "DhenuChatApp",
    slug: "DhenuChatApp",
    version: "1.0.0",
    extra: {
      DHENU_API_KEY: process.env.DHENU_API_KEY,
      SARVAM_API_KEY: process.env.SARVAM_API_KEY,
    },
  },
};
