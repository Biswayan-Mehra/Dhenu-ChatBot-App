import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";

const SARVAM_API_KEY = Constants.expoConfig.extra.SARVAM_API_KEY;
const SARVAM_URL = "https://api.sarvam.ai/speech-to-text";
const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";

const convertWebmToWav = async (uri) => {
  const newUri = uri.replace(".webm", ".wav"); // Change extension

  try {
    await FileSystem.copyAsync({
      from: uri,
      to: newUri,
    });
    console.log("Converted to WAV:", newUri);
    return newUri;
  } catch (error) {
    console.error("File conversion error:", error);
    return uri; // Fallback to original URI if conversion fails
  }
};

const translateAudioToText = async (uri) => {
  try {
    console.log("Starting audio translation with URI:", uri);

    // Convert file if needed
    let finalUri = uri;
    if (uri.endsWith(".webm")) {
      finalUri = await convertWebmToWav(uri);
    }

    // Log the file information
    console.log("Final URI after conversion:", finalUri);
    const fileInfo = await FileSystem.getInfoAsync(finalUri);
    console.log("File info:", fileInfo);

    // Prepare the file for API request
    const formData = new FormData();
    formData.append("file", {
      uri: finalUri,
      name: "recording.wav",
      type: "audio/wav",
    });

    formData.append("model", "saarika:v2");
    formData.append("prompt", "");
    formData.append("detect_language", "true");
    formData.append("with_diarization", "false");
    formData.append("num_speakers", "1");

    console.log("Sending request to Sarvam API...");

    const apiResponse = await fetch(SARVAM_URL, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: formData,
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(
        `API request failed: ${apiResponse.status} - ${errorText}`
      );
    }

    const data = await apiResponse.json();
    console.log("Sarvam API Full Response:", JSON.stringify(data, null, 2));

    // Check for transcript instead of text
    if (!data.transcript) {
      throw new Error("No translated text found in response");
    }

    // Clean up the translated text
    const cleanedText = data.transcript.trim();
    console.log("Cleaned translated text:", cleanedText);

    // Return both the transcript and the detected language code
    return {
      text: cleanedText,
      languageCode: data.language_code || "en", // Ensure language_code is used
    };
  } catch (error) {
    console.error("Sarvam API Error:", error);
    throw error;
  }
};

const textToSpeech = async (text, detectedLanguage = "hi-IN") => {
  try {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      throw new Error("Invalid text input for TTS");
    }

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

    const targetLanguageCode = supportedLanguages.includes(detectedLanguage)
      ? detectedLanguage
      : "en-IN"; // Fallback to English if language is not supported

    console.log(`Converting text to speech in language: ${targetLanguageCode}`);

    const payload = {
      inputs: [text.trim()],
      target_language_code: targetLanguageCode,
      speaker: "meera",
      pitch: 0,
      pace: 1.0,
      loudness: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: false,
      model: "bulbul:v1",
    };

    console.log("Sending TTS request to Sarvam API with payload:", payload);

    const response = await fetch(SARVAM_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `TTS API request failed: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("TTS API Response:", data);

    if (!data.audios || data.audios.length === 0) {
      throw new Error("No audio data returned from TTS API");
    }

    const audioBase64 = data.audios[0];
    const audioDir = `${FileSystem.documentDirectory}tts-audio/`;
    const audioPath = `${audioDir}tts_${Date.now()}.wav`;

    const dirInfo = await FileSystem.getInfoAsync(audioDir);
    if (!dirInfo.exists) {
      console.log("Creating TTS audio directory...");
      await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
    }

    await FileSystem.writeAsStringAsync(audioPath, audioBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log("TTS audio saved to:", audioPath);
    return audioPath;
  } catch (error) {
    console.error("TTS API Error:", error);
    throw error;
  }
};

export { translateAudioToText, textToSpeech };
