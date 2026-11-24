import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
import { Redirect } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { MemberCard } from "@/components/MemberCard";
import { mockMembers } from "@/constants/mockMembers";
import { useAuth } from "@/contexts/AuthContext";
import { isProfileReady } from "@/utils/profileValidation";

export default function ExploreScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);

  const { profile } = useAuth();

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (!profile?.gymId) {
    return <Redirect href="/gym" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Découvrir</Text>

      <Text style={styles.subtitle}>Les sportifs disponibles</Text>

      <FlatList
        data={mockMembers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MemberCard name={item.name} level={item.level} goal={item.goal} />
        )}
      />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
  },

  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 24,
  },

  list: {
    gap: 16,
    paddingBottom: 24,
  },
});
}
