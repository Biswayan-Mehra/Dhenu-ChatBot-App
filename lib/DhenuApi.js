import axios from "axios";
import Constants from "expo-constants";

const API_KEY = Constants.expoConfig.extra.DHENU_API_KEY;
const BASE_URL = "https://api.dhenu.ai/v1";

export const askDhenu = async (question) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: "dhenu2-in-8b-preview",
        messages: [{ role: "user", content: question }],
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error:", error);
    return "Error fetching response.";
  }
};
