import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
  SafeAreaView,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  ActivityIndicator,
  useTheme,
  Provider as PaperProvider,
  DefaultTheme,
  IconButton,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { askDhenu } from "../lib/DhenuApi";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { translateAudioToText, textToSpeech } from "../lib/SarvamApi";

// Custom dark theme
const darkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: "#7C4DFF", // Purple primary
    accent: "#03DAC6",
    background: "#121212",
    surface: "#1E1E1E",
    text: "#FFFFFF",
    disabled: "#757575",
    placeholder: "#9E9E9E",
    backdrop: "rgba(0, 0, 0, 0.5)",
    onSurface: "#FFFFFF",
    notification: "#FF453A",
  },
};

const playAudio = async (uri) => {
  try {
    console.log("Playing audio:", uri);
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
  } catch (error) {
    console.error("Error playing audio:", error);
    alert("Failed to play audio.");
  }
};

const ChatMessage = ({ message, isUser }) => {
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [loadingTTS, setLoadingTTS] = useState(false);

  const handleTTS = async () => {
    try {
      if (!message.answer || message.answer === "Processing voice message...") {
        return;
      }

      setLoadingTTS(true);

      // Ensure detectedLanguage follows BCP-47 (e.g., "hi-IN" instead of "hi")
      const detectedLanguage = message.languageCode || "en-IN"; // Default to en-IN

      // Check if detectedLanguage is valid
      const supportedLanguages = [
        "hi-IN",
        "bn-IN",
        "kn-IN",
        "ml-IN",
        "mr-IN",
        "od-IN",
        "pa-IN",
        "ta-IN",
        "te-IN",
        "en-IN",
        "gu-IN",
      ];

      const languageCode = supportedLanguages.includes(detectedLanguage)
        ? detectedLanguage
        : "en-IN"; // Fallback to en-IN

      console.log(`TTS request with language code: ${languageCode}`);

      // Generate TTS
      if (!message.ttsAudioPath) {
        const ttsPath = await textToSpeech(message.answer, languageCode);
        message.ttsAudioPath = ttsPath;

        // Save updated chat history
        try {
          const existingChats = await AsyncStorage.getItem("chatHistory");
          if (existingChats) {
            const parsedChats = JSON.parse(existingChats);
            const updatedChats = parsedChats.map((chat) =>
              chat.timestamp === message.timestamp
                ? { ...chat, ttsAudioPath: ttsPath }
                : chat
            );
            await AsyncStorage.setItem(
              "chatHistory",
              JSON.stringify(updatedChats)
            );
          }
        } catch (error) {
          console.error("Error updating chat history with TTS path:", error);
        }
      }

      // Play the audio
      setIsPlayingTTS(true);
      await playAudio(message.ttsAudioPath);
      setIsPlayingTTS(false);
    } catch (error) {
      console.error("Error handling TTS:", error);
      alert("Failed to play TTS audio");
    } finally {
      setLoadingTTS(false);
    }
  };

  if (message.answer === "Processing voice message...") {
    return (
      <View style={isUser ? styles.userBubble : styles.aiBubble}>
        <View style={styles.processingContainer}>
          <Text style={styles.aiText}>Processing voice message</Text>
          <ActivityIndicator
            size="small"
            color="#03DAC6"
            style={styles.processingSpinner}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={isUser ? styles.userBubble : styles.aiBubble}>
      {message.isAudioMessage && isUser && (
        <View style={styles.audioContainer}>
          <View style={styles.audioControls}>
            <IconButton
              icon="play"
              size={20}
              color="#03DAC6"
              style={styles.audioIcon}
              onPress={() => playAudio(message.audioPath)}
            />
            <Text style={styles.audioText}>Voice Message</Text>
          </View>
        </View>
      )}
      <Text style={isUser ? styles.userText : styles.aiText}>
        {isUser ? message.question : message.answer}
      </Text>

      {/* TTS button for AI responses */}
      {!isUser && (
        <View style={styles.ttsContainer}>
          <IconButton
            icon={
              loadingTTS ? "loading" : isPlayingTTS ? "pause" : "volume-high"
            }
            size={20}
            color="#03DAC6"
            style={styles.ttsIcon}
            onPress={handleTTS}
            disabled={loadingTTS}
            loading={loadingTTS}
          />
        </View>
      )}
    </View>
  );
};

export default function ChatScreen() {
  const theme = darkTheme;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [typingAnswer, setTypingAnswer] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const router = useRouter();
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const introFadeAnim = useRef(new Animated.Value(0)).current;
  const [recording, setRecording] = useState();
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadChatHistory();
  }, []);

  // Simulate typing effect
  useEffect(() => {
    if (isTyping && answer) {
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex <= answer.length) {
          setTypingAnswer(answer.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 15);

      return () => {
        clearInterval(typingInterval);
      };
    }
  }, [isTyping, answer]);

  // Fade in animation for the answer card
  useEffect(() => {
    if (answer) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [answer]);

  // Fade in for intro message
  useEffect(() => {
    if (showIntro) {
      Animated.timing(introFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [showIntro]);

  const processResponseForIntro = (response) => {
    let updatedResponse = response;

    if (updatedResponse.includes("Dhenu2")) {
      updatedResponse = updatedResponse.replace(
        "Dhenu2",
        "Your Farming Assistant"
      );
    }

    if (updatedResponse.includes("KissanAI")) {
      updatedResponse = updatedResponse.replace("KissanAI", "Mr. Mehra");
    }

    return updatedResponse;
  };

  const startRecording = async () => {
    try {
      console.log("Requesting permissions...");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Microphone permission is required!");
        return;
      }

      console.log("Setting audio mode...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording...");
      const recordingObject = new Audio.Recording();

      const recordingOptions = {
        android: {
          extension: ".wav",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      await recordingObject.prepareToRecordAsync(recordingOptions);
      await recordingObject.startAsync();
      setRecording(recordingObject);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  // Updated stopRecording function to handle language detection
  const stopRecording = async () => {
    try {
      if (!recording) {
        console.log("No active recording to stop.");
        return;
      }

      console.log("Stopping recording...");
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(undefined);

      if (!uri) {
        throw new Error("Recording URI is undefined");
      }
      console.log("Recording URI:", uri);

      let finalUri = uri;

      if (Platform.OS !== "web") {
        console.log("Checking file on native...");
        const fileInfo = await FileSystem.getInfoAsync(uri);
        console.log("File info:", fileInfo);

        if (!fileInfo.exists) {
          throw new Error("Recording file not found.");
        }

        const timestamp = Date.now();
        const audioDir = `${FileSystem.documentDirectory}audio/`;
        const newAudioPath = `${audioDir}audio_${timestamp}.m4a`;

        const dirInfo = await FileSystem.getInfoAsync(audioDir);
        if (!dirInfo.exists) {
          console.log("Creating audio directory...");
          await FileSystem.makeDirectoryAsync(audioDir, {
            intermediates: true,
          });
        }

        console.log("Copying file to:", newAudioPath);
        await FileSystem.copyAsync({ from: uri, to: newAudioPath });

        finalUri = newAudioPath;
        console.log("Audio saved successfully:", finalUri);
      }

      const translationResult = await translateAudioToText(finalUri);
      const translatedText = translationResult.text;
      const detectedLanguage = translationResult.languageCode;

      if (translatedText) {
        console.log("Translation successful:", translatedText);
        console.log("Detected language:", detectedLanguage);

        await handleAsk(translatedText, finalUri, detectedLanguage);
      } else {
        console.error("Translation failed.");
      }
    } catch (error) {
      console.error("Recording error:", error);
    }
  };

  // Update the handleAsk function to handle language code
  const handleAsk = async (
    questionText = question,
    audioPath = null,
    languageCode = "en"
  ) => {
    if (!questionText.trim()) return;

    // Reset states
    setTypingAnswer("");
    fadeAnim.setValue(0);
    setLoading(true);

    try {
      const response = await askDhenu(questionText);
      const cleanedResponse = processResponseForIntro(response);

      // Create new chat item immediately
      const newChatItem = {
        question: questionText,
        answer: cleanedResponse,
        audioPath: audioPath,
        timestamp: Date.now(),
        isAudioMessage: !!audioPath,
        languageCode: languageCode, // Ensure languageCode is passed correctly
      };

      // Update chat history first
      const updatedHistory = [...chatHistory, newChatItem];
      setChatHistory(updatedHistory);
      await saveChatHistory(updatedHistory);

      // Start typing animation
      setLoading(false);
      setAnswer(cleanedResponse);
      setIsTyping(true);
      setQuestion("");

      // Animate fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Scroll to bottom
      if (scrollViewRef.current) {
        setTimeout(() => {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error("Error in handleAsk:", error);
      setLoading(false);
    }
  };

  const saveChatHistory = async (history) => {
    try {
      await AsyncStorage.setItem("chatHistory", JSON.stringify(history));
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const existingChats = await AsyncStorage.getItem("chatHistory");
      if (existingChats) {
        const parsedChats = JSON.parse(existingChats);
        setChatHistory(parsedChats);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const clearChat = async () => {
    setAnswer("");
    setTypingAnswer("");
    setShowIntro(false);
    setChatHistory([]);
    //await AsyncStorage.removeItem("chatHistory");
  };

  const playAudio = async (audioPath) => {
    try {
      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      console.log("Loading audio from:", audioPath);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      // Listen for playback status
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      // Play the sound
      await newSound.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);
      alert("Failed to play audio");
    }
  };

  // Add cleanup for sound when component unmounts
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <PaperProvider theme={theme}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Farming ChatBot</Text>
          </View>

          <ScrollView
            style={styles.chatContainer}
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {chatHistory.length === 0 && !loading && !isTyping && (
              <View style={styles.emptyStateContainer}>
                <IconButton
                  icon="robot"
                  size={64}
                  color="#BB86FC"
                  style={styles.emptyStateIcon}
                />
                <Text style={styles.emptyStateText}>
                  Ask me anything about agriculture, farming practices, or crop
                  management.
                </Text>
                <Text style={styles.emptyStateSubText}>
                  You can type or use voice input to ask your questions.
                </Text>
              </View>
            )}

            {chatHistory.map((chat, index) => (
              <View key={index} style={styles.chatBubbleContainer}>
                <ChatMessage message={chat} isUser={true} />
                <ChatMessage message={chat} isUser={false} />
              </View>
            ))}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#BB86FC" />
                <Text style={styles.loadingText}>
                  Processing your request...
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.bottomContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                label="Ask something..."
                mode="outlined"
                value={question}
                onChangeText={setQuestion}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={() => handleAsk()}
                disabled={loading || isTyping || isRecording}
                theme={{ colors: { primary: theme.colors.primary } }}
                selectionColor={theme.colors.primary}
                outlineColor="#333333"
                activeOutlineColor="#BB86FC"
                textColor="#FFFFFF"
                placeholderTextColor="#666666"
                dense
              />
              <IconButton
                icon={isRecording ? "stop" : "microphone"}
                size={28}
                onPress={isRecording ? stopRecording : startRecording}
                color={isRecording ? "#FF453A" : "#03DAC6"}
                style={styles.recordButton}
              />
              <Button
                mode="contained"
                onPress={() => handleAsk()}
                style={styles.sendButton}
                labelStyle={styles.buttonLabel}
                disabled={
                  loading || isTyping || !question.trim() || isRecording
                }
                color="#BB86FC"
              >
                {loading ? "..." : "Ask"}
              </Button>
            </View>

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={clearChat}
                style={[styles.actionButton, styles.clearButton]}
                labelStyle={styles.buttonText}
                color="#FF5252"
              >
                Reset
              </Button>
              <Button
                mode="outlined"
                onPress={() => router.push("/history")}
                style={[styles.actionButton, styles.historyButton]}
                labelStyle={styles.buttonText}
                color="#03DAC6"
              >
                History
              </Button>
            </View>
          </View>
        </View>
      </PaperProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 21,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 8,
  },
  input: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "#2C2C2C",
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  chatContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    marginTop: 100,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    color: "#E1E1E1",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
  },
  emptyStateSubText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  chatBubbleContainer: {
    marginBottom: 24,
  },
  loadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  loadingText: {
    color: "#BB86FC",
    marginTop: 12,
    fontSize: 14,
  },
  bottomContainer: {
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    backgroundColor: "#1E1E1E",
    elevation: 8,
  },
  recordButton: {
    margin: 0,
    backgroundColor: "#2C2C2C",
    borderRadius: 12,
    marginRight: 8,
  },
  sendButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: "center",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearButton: {
    borderColor: "#FF5252",
  },
  historyButton: {
    borderColor: "#03DAC6",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  userBubble: {
    backgroundColor: "#BB86FC20",
    borderRadius: 20,
    borderBottomRightRadius: 5,
    padding: 16,
    maxWidth: "85%",
    alignSelf: "flex-end",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BB86FC40",
  },
  aiBubble: {
    backgroundColor: "#2C2C2C",
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    padding: 16,
    maxWidth: "85%",
    alignSelf: "flex-start",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  userText: {
    color: "#E1E1E1",
    fontSize: 16,
    lineHeight: 22,
  },
  aiText: {
    color: "#E1E1E1",
    fontSize: 16,
    lineHeight: 22,
  },
  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  processingSpinner: {
    marginLeft: 8,
  },
  ttsContainer: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  ttsIcon: {
    margin: 0,
    backgroundColor: "rgba(3, 218, 198, 0.1)",
    borderRadius: 12,
  },
  audioContainer: {
    marginBottom: 8,
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(3, 218, 198, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  audioIcon: {
    margin: 0,
    padding: 4,
  },
  audioText: {
    color: "#03DAC6",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  audioSeparator: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(3, 218, 198, 0.2)",
    marginHorizontal: 8,
  },
});
