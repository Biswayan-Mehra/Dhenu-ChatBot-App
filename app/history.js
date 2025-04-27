import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import {
  Card,
  Text,
  Button,
  IconButton,
  ActivityIndicator,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { textToSpeech } from "../lib/SarvamApi";

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

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const router = useRouter();
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const existingChats = await AsyncStorage.getItem("chatHistory");
      setHistory(existingChats ? JSON.parse(existingChats) : []);
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem("chatHistory");
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  const playAudio = async (audioPath) => {
    try {
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

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      await newSound.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);
      alert("Failed to play audio");
    }
  };

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const ChatHistoryItem = ({ chat }) => {
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [isTTSPlaying, setIsTTSPlaying] = useState(false);
    const [loadingTTS, setLoadingTTS] = useState(false);

    const handleTTS = async () => {
      try {
        if (!chat.answer || chat.answer === "Processing voice message...") {
          return;
        }

        setLoadingTTS(true);

        // Use the stored language code or default to English
        const languageCode = chat.languageCode || "en";

        // Generate TTS if not already generated
        if (!chat.ttsAudioPath) {
          const ttsPath = await textToSpeech(chat.answer, languageCode);

          // Update the message with the TTS audio path
          chat.ttsAudioPath = ttsPath;

          // Save to AsyncStorage
          try {
            const existingChats = await AsyncStorage.getItem("chatHistory");
            if (existingChats) {
              const parsedChats = JSON.parse(existingChats);
              const updatedChats = parsedChats.map((item) =>
                item.timestamp === chat.timestamp
                  ? { ...item, ttsAudioPath: ttsPath }
                  : item
              );
              await AsyncStorage.setItem(
                "chatHistory",
                JSON.stringify(updatedChats)
              );
              setHistory(updatedChats);
            }
          } catch (error) {
            console.error("Error updating chat history with TTS path:", error);
          }
        }

        // Play the audio
        setIsTTSPlaying(true);
        await playAudio(chat.ttsAudioPath);
        setIsTTSPlaying(false);
      } catch (error) {
        console.error("Error handling TTS:", error);
        alert("Failed to play TTS audio");
      } finally {
        setLoadingTTS(false);
      }
    };

    return (
      <Card style={styles.chatCard}>
        <Card.Content>
          <View style={styles.questionContainer}>
            {chat.isAudioMessage && (
              <View style={styles.audioQuestionContainer}>
                <TouchableOpacity
                  style={styles.audioButton}
                  onPress={() => {
                    setIsAudioPlaying(true);
                    playAudio(chat.audioPath).finally(() =>
                      setIsAudioPlaying(false)
                    );
                  }}
                >
                  <IconButton
                    icon={isAudioPlaying ? "pause" : "play"}
                    size={16}
                    color="#03DAC6"
                    style={styles.audioIcon}
                  />
                  <Text style={styles.audioText}>Voice Message</Text>
                </TouchableOpacity>
                <Text style={styles.question}>
                  Q: {chat.question.replace("🎤 ", "")}
                </Text>
              </View>
            )}
            {!chat.isAudioMessage && (
              <Text style={styles.question}>Q: {chat.question}</Text>
            )}
          </View>
          <View style={styles.answerContainer}>
            <Text style={styles.answer}>A: {chat.answer}</Text>

            {/* TTS Button */}
            <TouchableOpacity
              style={styles.ttsButton}
              onPress={handleTTS}
              disabled={loadingTTS}
            >
              {loadingTTS ? (
                <ActivityIndicator size="small" color="#03DAC6" />
              ) : (
                <IconButton
                  icon={isTTSPlaying ? "pause" : "volume-high"}
                  size={16}
                  color="#03DAC6"
                  style={styles.ttsIcon}
                />
              )}
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="keyboard-backspace"
            size={24}
            color="#FFFFFF"
            onPress={() => router.back()}
          />
          <Text style={styles.title}>Chat History</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          {history.length > 0 ? (
            history.map((chat, index) => (
              <ChatHistoryItem key={index} chat={chat} />
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <IconButton
                icon="history"
                size={64}
                color="#BB86FC"
                style={styles.emptyStateIcon}
              />
              <Text style={styles.noHistory}>No chat history available.</Text>
              <Text style={styles.noHistorySubText}>
                Your conversations will appear here.
              </Text>
            </View>
          )}
        </ScrollView>

        {history.length > 0 && (
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={clearHistory}
              style={styles.clearButton}
              labelStyle={styles.buttonText}
              color="#FF5252"
            >
              Clear History
            </Button>
          </View>
        )}
      </View>
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
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  audioButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(3, 218, 198, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  audioText: {
    color: "#03DAC6",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  noHistory: {
    fontSize: 18,
    color: "#E1E1E1",
    marginBottom: 8,
  },
  noHistorySubText: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
  },
  chatCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333333",
    elevation: 2,
  },
  questionContainer: {
    marginBottom: 12,
  },
  audioQuestionContainer: {
    flex: 1,
  },
  question: {
    fontSize: 16,
    fontWeight: "600",
    color: "#BB86FC",
    marginTop: 4,
    lineHeight: 22,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: "#1E1E1E",
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
  clearButton: {
    borderRadius: 12,
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  audioIcon: {
    margin: 0,
    padding: 2,
  },
  audioSeparator: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(3, 218, 198, 0.2)",
    marginHorizontal: 6,
  },
  answerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  answer: {
    fontSize: 15,
    color: "#E1E1E1",
    lineHeight: 22,
    flex: 1,
    marginRight: 8,
  },
  ttsButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(3, 218, 198, 0.1)",
    borderRadius: 12,
    padding: 2,
  },
  ttsIcon: {
    margin: 0,
  },
});
