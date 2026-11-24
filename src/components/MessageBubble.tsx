import { StyleSheet, Text, View } from "react-native";

import type { ChatMessage } from "@/types/chatMessage";

type MessageBubbleProps = {
  message: ChatMessage;
  mine: boolean;
};

function formatMessageTime(message: ChatMessage) {
  if (!message.createdAt) {
    return "Envoi...";
  }

  return message.createdAt.toDate().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message, mine }: MessageBubbleProps) {
  return (
    <View style={[styles.row, mine ? styles.mineRow : styles.theirRow]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.text, mine ? styles.mineText : styles.theirText]}>{message.text}</Text>
        <Text style={[styles.time, mine ? styles.mineTime : styles.theirTime]}>
          {formatMessageTime(message)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 8,
  },

  mineRow: {
    alignItems: "flex-end",
  },

  theirRow: {
    alignItems: "flex-start",
  },

  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  mine: {
    backgroundColor: "#3C87F7",
  },

  theirs: {
    backgroundColor: "#FFFFFF",
  },

  text: {
    fontSize: 16,
    lineHeight: 22,
  },

  mineText: {
    color: "#FFFFFF",
  },

  theirText: {
    color: "#1F2937",
  },

  time: {
    marginTop: 4,
    fontSize: 12,
  },

  mineTime: {
    color: "#DBEAFE",
  },

  theirTime: {
    color: "#6B7280",
  },
});
