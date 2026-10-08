import { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const LEVELS = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
];

const SPORTS = [
  "Musculation",
  "Fitness",
  "Running",
  "Cardio",
  "CrossFit",
  "Boxe",
];

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

type Availability = {
  day: number;
  start: number;
  end: number;
};

export default function ProfileScreen() {
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [bio, setBio] = useState("");

  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  function toggleSport(sport: string) {
    setSports((currentSports) => {
      if (currentSports.includes(sport)) {
        return currentSports.filter((item) => item !== sport);
      }

      return [...currentSports, sport];
    });
  }

  function addAvailability() {
    const startMinutes = Number(start);
    const endMinutes = Number(end);

    if (
      !Number.isInteger(startMinutes) ||
      !Number.isInteger(endMinutes) ||
      startMinutes < 0 ||
      endMinutes > 1440 ||
      startMinutes >= endMinutes
    ) {
      setErrors(["La disponibilité doit respecter : 0 ≤ début < fin ≤ 1440."]);
      setSuccess(false);
      return;
    }

    setAvailability((current) => [
      ...current,
      {
        day,
        start: startMinutes,
        end: endMinutes,
      },
    ]);

    setStart("");
    setEnd("");
    setErrors([]);
  }

  function validateProfile() {
    const validationErrors: string[] = [];

    if (displayName.trim().length < 2) {
      validationErrors.push("Le nom doit contenir au moins 2 caractères.");
    }

    if (city.trim().length < 2) {
      validationErrors.push("La ville doit contenir au moins 2 caractères.");
    }

    if (!level) {
      validationErrors.push("Choisissez un niveau.");
    }

    if (!goal.trim()) {
      validationErrors.push("Indiquez votre objectif.");
    }

    if (sports.length === 0) {
      validationErrors.push("Sélectionnez au moins un sport.");
    }

    if (availability.length === 0) {
      validationErrors.push("Ajoutez au moins une disponibilité.");
    }

    if (bio.length > 280) {
      validationErrors.push("La bio ne peut pas dépasser 280 caractères.");
    }

    setErrors(validationErrors);
    setSuccess(validationErrors.length === 0);
  }

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  function getDayName(dayNumber: number) {
    return DAYS.find((item) => item.value === dayNumber)?.label;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Mon profil</Text>

      <Text style={styles.subtitle}>Complète ton profil sportif</Text>

      {/* NOM */}

      <Text style={styles.label}>Nom affiché</Text>

      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Ex : Lina"
        style={styles.input}
      />

      {/* VILLE */}

      <Text style={styles.label}>Ville</Text>

      <TextInput
        value={city}
        onChangeText={setCity}
        placeholder="Ex : Guyancourt"
        style={styles.input}
      />

      {/* NIVEAU */}

      <Text style={styles.label}>Niveau</Text>

      <View style={styles.optionsContainer}>
        {LEVELS.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setLevel(item.value)}
            style={[
              styles.option,
              level === item.value && styles.optionSelected,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                level === item.value && styles.optionTextSelected,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* OBJECTIF */}

      <Text style={styles.label}>Objectif</Text>

      <TextInput
        value={goal}
        onChangeText={setGoal}
        placeholder="Ex : Remise en forme"
        style={styles.input}
      />

      {/* SPORTS */}

      <Text style={styles.label}>Sports</Text>

      <View style={styles.optionsContainer}>
        {SPORTS.map((sport) => (
          <Pressable
            key={sport}
            onPress={() => toggleSport(sport)}
            style={[
              styles.option,
              sports.includes(sport) && styles.optionSelected,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                sports.includes(sport) && styles.optionTextSelected,
              ]}
            >
              {sport}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* DISPONIBILITÉ */}

      <Text style={styles.label}>Disponibilités</Text>

      <Text style={styles.helper}>
        Les horaires sont exprimés en minutes depuis minuit. Exemple : 18h =
        1080.
      </Text>

      <View style={styles.optionsContainer}>
        {DAYS.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setDay(item.value)}
            style={[styles.option, day === item.value && styles.optionSelected]}
          >
            <Text
              style={[
                styles.optionText,
                day === item.value && styles.optionTextSelected,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={start}
        onChangeText={setStart}
        placeholder="Début en minutes (ex : 1080)"
        keyboardType="numeric"
        style={styles.input}
      />

      <TextInput
        value={end}
        onChangeText={setEnd}
        placeholder="Fin en minutes (ex : 1200)"
        keyboardType="numeric"
        style={styles.input}
      />

      <Pressable style={styles.secondaryButton} onPress={addAvailability}>
        <Text style={styles.secondaryButtonText}>
          Ajouter cette disponibilité
        </Text>
      </Pressable>

      {availability.map((item, index) => (
        <View key={`${item.day}-${index}`} style={styles.availability}>
          <Text style={styles.availabilityText}>
            {getDayName(item.day)} : {formatMinutes(item.start)} -{" "}
            {formatMinutes(item.end)}
          </Text>
        </View>
      ))}

      {/* BIO */}

      <Text style={styles.label}>Bio</Text>

      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="Présente-toi..."
        multiline
        maxLength={280}
        style={[styles.input, styles.bioInput]}
      />

      <Text style={styles.counter}>{bio.length}/280</Text>

      {/* ERREURS */}

      {errors.length > 0 && (
        <View style={styles.errorContainer}>
          {errors.map((error) => (
            <Text key={error} style={styles.error}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      {/* SUCCÈS */}

      {success && <Text style={styles.success}>Profil valide !</Text>}

      <Pressable style={styles.button} onPress={validateProfile}>
        <Text style={styles.buttonText}>Valider mon profil</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 28,
    fontSize: 16,
    color: "#6B7280",
  },

  label: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },

  helper: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },

  bioInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },

  counter: {
    textAlign: "right",
    marginTop: 5,
    color: "#6B7280",
    fontSize: 12,
  },

  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  option: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },

  optionSelected: {
    backgroundColor: "#3C87F7",
    borderColor: "#3C87F7",
  },

  optionText: {
    color: "#374151",
    fontWeight: "600",
  },

  optionTextSelected: {
    color: "#FFFFFF",
  },

  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#3C87F7",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#3C87F7",
    fontWeight: "700",
  },

  availability: {
    backgroundColor: "#E0ECFF",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },

  availabilityText: {
    color: "#1E40AF",
    fontWeight: "600",
  },

  errorContainer: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
  },

  error: {
    color: "#B91C1C",
    marginBottom: 4,
  },

  success: {
    marginTop: 20,
    color: "#15803D",
    fontWeight: "700",
    textAlign: "center",
  },

  button: {
    marginTop: 24,
    backgroundColor: "#3C87F7",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
