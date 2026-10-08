import { MemberCard } from "@/components/MemberCard";
import { mockMembers } from "@/constants/mockMembers";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function ExploreScreen() {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: 64,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
  },

  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 24,
  },

  list: {
    gap: 16,
    paddingBottom: 24,
  },
});
