import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { Platform, View, StyleSheet } from "react-native";

export default function Layout() {
  const theme = useColorScheme();

  return (
    <View style={styles.root}>
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          animationDuration: 400,
          contentStyle: {
            backgroundColor: "#121212", // Apply dark background globally
          },
          presentation: "modal",
          animation: Platform.OS === "android" ? "fade" : "fade",
          animationTypeForReplace: "push",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            presentation: "containedModal",
            animation: "fade",
            animationDuration: 200,
            contentStyle: {
              backgroundColor: "#121212", // Important for initial screen
            },
          }}
        />
        <Stack.Screen
          name="chat"
          options={{
            animation: "slide_from_left",
            animationDuration: 200,
            contentStyle: {
              backgroundColor: "#121212", // Every screen gets dark bg
            },
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            animation: "slide_from_right",
            animationDuration: 200,
            gestureEnabled: true, // Optional: prevents swipe dismiss white flash
            contentStyle: {
              backgroundColor: "#121212",
            },
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#121212", // Important: ensures no white root view
  },
});
