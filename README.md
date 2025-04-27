
# 🌾 AssistiveFarmingBot

### 🤖 AI-Powered Farming Assistant

**AssistiveFarmingBot** is an AI-driven chatbot designed to support farmers by providing real-time agricultural insights, weather updates, crop management tips, and pest control solutions. Built using **React Native, Expo, and AI-powered APIs**, it enables users to interact via text and voice for a seamless farming advisory experience.

---

## 🚀 Features

✅ **AI-powered chatbot** for farming queries

✅ **Voice-to-text support** for hands-free interaction

✅ **Weather updates** for smart agricultural decisions

✅ **Pest & disease diagnosis** with instant solutions

✅ **Personalized farming recommendations** based on crop data

✅ **Chat history storage** for easy reference

---

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo)
- **Backend APIs:** Dhenu AI for chatbot, Sarvam AI for speech recognition
- **Storage:** AsyncStorage (Local storage for chat history)
- **Audio Processing:** Expo Audio, Expo FileSystem
- **UI Components:** React Native Paper

---

## 📂 Project Structure

```
AssistiveFarmingBot/
├── src/                      # Core bot logic
│   ├── components/           # Reusable UI components
│   ├── screens/              # App screens (Chat, History, etc.)
│   ├── api/                  # API calls (Dhenu & Sarvam)
│   ├── styles/               # Global styling
│   ├── utils/                # Helper functions
│   ├── assets/               # Images & icons
│   ├── index.tsx             # Entry point
│   ├── chat.js               # Chat screen logic
│   ├── history.js            # Chat history logic
│   ├── _layout.tsx           # Navigation and theming
│   ├── DhenuApi.js           # API integration with Dhenu AI
│   ├── SarvamApi.js          # Voice processing with Sarvam AI
└── README.md                 # This file
```

---

## 📦 Installation & Setup

Clone the repository:
```bash
git clone https://github.com/Biswayan-Mehra/Dhenu-ChatBot-App.git
```

Navigate into the folder:
```bash
cd AssistiveFarmingBot
```

Install dependencies:
```bash
npm install
```

Run the app (Expo):
```bash
npx expo start
```

---

## 🎤 Using Voice Commands

- **Start recording:** Tap the microphone icon
- **Speak your query** (e.g., “What is the best fertilizer for wheat?”)
- **Processing:** The app converts voice to text and queries Dhenu AI
- **Response:** AI provides the best farming advice

---

## 📚 How It Works

1️⃣ **User asks a question** (text or voice input)

2️⃣ **Dhenu AI processes the query** and generates a response

3️⃣ **Response is displayed** in the chat interface

4️⃣ **User can play voice responses** or view history

---

## 🛠️ API Integration

- **Dhenu AI** (`DhenuApi.js`): Handles chatbot responses
- **Sarvam AI** (`SarvamApi.js`): Converts speech to text

Both APIs require API keys configured in `expo-constants`.

---

## 📜 Future Enhancements

✅ **Multi-language support** for wider accessibility

✅ **Crop disease image recognition** via AI models

✅ **Integration with IoT sensors** for real-time farm data

---

## 🤝 Contributing

We welcome contributions! To contribute:
1. **Fork the repo**
2. **Create a new branch** (`feature-xyz`)
3. **Commit changes & push**
4. **Submit a pull request**

---

If you find this project useful, **please ⭐️ star this repo!**
