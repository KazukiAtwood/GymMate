import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { SessionStatus } from "@/types/trainingSession";

const STATUS_LABELS: Record<SessionStatus, string> = {
  planned: "Planifiée",
  done: "Terminée",
  cancelled: "Annulée",
};

type SessionCardProps = {
  partnerName: string;
  gymName: string;
  sport: string;
  date: string;
  hours: string;
  status: SessionStatus;
  canComplete?: boolean;
  pending?: boolean;
  reminderScheduled?: boolean;
  reminderPending?: boolean;
  calendarAdded?: boolean;
  calendarPending?: boolean;
  onCancel?: () => void;
  onComplete?: () => void;
  onScheduleReminder?: () => void;
  onCancelReminder?: () => void;
  onAddToCalendar?: () => void;
};

export function SessionCard({
  partnerName,
  gymName,
  sport,
  date,
  hours,
  status,
  canComplete = false,
  pending = false,
  reminderScheduled = false,
  reminderPending = false,
  calendarAdded = false,
  calendarPending = false,
  onCancel,
  onComplete,
  onScheduleReminder,
  onCancelReminder,
  onAddToCalendar,
}: SessionCardProps) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{partnerName}</Text>
        <Text style={[styles.badge, styles[status]]}>{STATUS_LABELS[status]}</Text>
      </View>
      <Text style={styles.line}>{gymName}</Text>
      <Text style={styles.line}>{sport}</Text>
      <Text style={styles.line}>{date}</Text>
      <Text style={styles.line}>{hours}</Text>
      {status === "planned" ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.secondary, pending && styles.disabled]}
            disabled={pending || reminderPending || calendarPending}
            onPress={onCancel}
          >
            {pending ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.secondaryText}>Annuler</Text>
            )}
          </Pressable>
          {canComplete ? (
            <Pressable
              style={[styles.primary, pending && styles.disabled]}
              disabled={pending || reminderPending || calendarPending}
              onPress={onComplete}
            >
              <Text style={styles.primaryText}>Terminer</Text>
            </Pressable>
          ) : null}
          {onScheduleReminder || onCancelReminder ? (
            <Pressable
              style={[styles.secondary, (pending || reminderPending || calendarPending) && styles.disabled]}
              disabled={pending || reminderPending || calendarPending}
              onPress={reminderScheduled ? onCancelReminder : onScheduleReminder}
            >
              {reminderPending ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.secondaryText}>
                  {reminderScheduled ? "Annuler le rappel" : "Me rappeler"}
                </Text>
              )}
            </Pressable>
          ) : null}
          {onAddToCalendar ? (
            <Pressable
              style={[
                styles.secondary,
                (pending || reminderPending || calendarPending || calendarAdded) && styles.disabled,
              ]}
              disabled={pending || reminderPending || calendarPending || calendarAdded}
              onPress={onAddToCalendar}
            >
              {calendarPending ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.secondaryText}>
                  {calendarAdded ? "Dans le calendrier" : "Au calendrier"}
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },

  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },

  badge: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },

  planned: {
    backgroundColor: colors.infoSurface,
    color: colors.infoText,
  },

  done: {
    backgroundColor: colors.successSurface,
    color: colors.successText,
  },

  cancelled: {
    backgroundColor: colors.mutedSurface,
    color: colors.textMuted,
  },

  line: {
    marginTop: 4,
    color: colors.textMuted,
  },

  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  primary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },

  secondary: {
    flex: 1,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  secondaryText: {
    color: colors.text,
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.6,
  },
});
}
