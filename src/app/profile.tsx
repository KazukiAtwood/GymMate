import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/theme";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    DAYS,
    LEVELS,
    SPORTS,
    dayLabel,
    formatMinutes,
    parseClockToMinutes,
} from "@/constants/profileOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { logoutAccount } from "@/services/authService";
import { auth } from "@/services/firebase";
import {
    createInitialProfile,
    profileWriteErrorMessage,
    updateSportProfile,
} from "@/services/profileService";
import type { AvailabilitySlot, SportLevel } from "@/types/profile";
import {
    LIMITS,
    cleanDisplayName,
    hasFieldErrors,
    isProfileReady,
    isSportLevel,
    validateSportProfile,
    type ProfileFieldErrors,
} from "@/utils/profileValidation";

export default function ProfileScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);

  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const dirty = useRef(false);
  const { pending, run } = useSubmitLock();
  const { pending: signingOut, run: runLogout } = useSubmitLock();

  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [level, setLevel] = useState<SportLevel | "">("");
  const [goal, setGoal] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    if (profile || !user) {
      return;
    }

    void refreshProfile();
  }, [profile, user, refreshProfile]);

  useEffect(() => {
    if (dirty.current) {
      return;
    }

    if (profile) {
      setDisplayName(profile.displayName);
      setCity(profile.city);
      setLevel(profile.level);
      setGoal(profile.goal);
      setSports(profile.sports);
      setAvailability(profile.availability);
      setBio(profile.bio);
      return;
    }

    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [profile, user]);

  function touch() {
    dirty.current = true;
  }

  function toggleSport(sport: string) {
    touch();
    setSports((currentSports) => {
      if (currentSports.includes(sport)) {
        return currentSports.filter((item) => item !== sport);
      }

      return [...currentSports, sport];
    });
  }

  function addAvailability() {
    touch();
    const startMinutes = parseClockToMinutes(start);
    const endMinutes = parseClockToMinutes(end);

    if (
      startMinutes === null ||
      endMinutes === null ||
      startMinutes >= endMinutes
    ) {
      setErrors((current) => ({
        ...current,
        availability:
          "Indique une heure de début et de fin, par exemple 18:00 et 20:00.",
      }));
      return;
    }

    if (availability.length >= LIMITS.availabilityMax) {
      setErrors((current) => ({
        ...current,
        availability: "Vous pouvez enregistrer 14 disponibilités au maximum.",
      }));
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
    setErrors((current) => ({ ...current, availability: undefined }));
  }

  function removeAvailability(index: number) {
    touch();
    setAvailability((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleSave() {
    const nextErrors = validateSportProfile({
      displayName,
      city,
      level,
      goal,
      sports,
      availability,
      bio,
    });

    setErrors(nextErrors);
    setFormError(null);

    if (!user || hasFieldErrors(nextErrors) || !isSportLevel(level)) {
      return;
    }

    const profileInput = {
      displayName,
      city,
      level,
      goal,
      sports,
      availability,
      bio,
    };

    void run(async () => {
      try {
        if (!profile) {
          await createInitialProfile(user.uid, cleanDisplayName(displayName));
        }

        await updateSportProfile(user.uid, profileInput);
        const loaded = await refreshProfile();

        if (loaded && auth.currentUser?.uid === user.uid) {
          router.replace(profile?.gymId ? "/tabs/discover" : "/gym");
        }
      } catch (error) {
        console.error("Erreur d'enregistrement du profil :", error);
        setFormError(profileWriteErrorMessage(error));
      }
    });
  }

  function handleLogout() {
    setLogoutError(null);

    void runLogout(async () => {
      try {
        await logoutAccount();
      } catch (error) {
        console.error("Erreur de déconnexion :", error);
        setLogoutError("La déconnexion a échoué. Réessayez.");
      }
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.title}>Mon profil</Text>
        <Text style={styles.subtitle}>Complète ton profil sportif</Text>

        {!profile ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Votre compte est créé, mais le profil sportif n'est pas encore
              enregistré. Complétez-le pour continuer, sans vous inscrire à
              nouveau.
            </Text>
          </View>
        ) : null}

        {isProfileReady(profile) ? (
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>Retour</Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>Nom affiché</Text>
        <TextInput
          value={displayName}
          onChangeText={(value) => {
            touch();
            setDisplayName(value);
          }}
          placeholder="Ex : Lina"
          maxLength={LIMITS.displayNameMax}
          editable={!pending}
          style={styles.input}
        />
        {errors.displayName ? (
          <Text style={styles.fieldError}>{errors.displayName}</Text>
        ) : null}

        <Text style={styles.label}>Ville</Text>
        <TextInput
          value={city}
          onChangeText={(value) => {
            touch();
            setCity(value);
          }}
          placeholder="Ex : Guyancourt"
          maxLength={LIMITS.cityMax}
          editable={!pending}
          style={styles.input}
        />
        {errors.city ? <Text style={styles.fieldError}>{errors.city}</Text> : null}

        <Text style={styles.label}>Niveau</Text>
        <View style={styles.optionsContainer}>
          {LEVELS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => {
                touch();
                setLevel(item.value);
              }}
              style={[styles.option, level === item.value && styles.optionSelected]}
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
        {errors.level ? <Text style={styles.fieldError}>{errors.level}</Text> : null}

        <Text style={styles.label}>Objectif</Text>
        <TextInput
          value={goal}
          onChangeText={(value) => {
            touch();
            setGoal(value);
          }}
          placeholder="Ex : Remise en forme"
          maxLength={LIMITS.goalMax}
          editable={!pending}
          style={styles.input}
        />
        {errors.goal ? <Text style={styles.fieldError}>{errors.goal}</Text> : null}

        <Text style={styles.label}>Sports</Text>
        <View style={styles.optionsContainer}>
          {SPORTS.map((sport) => (
            <Pressable
              key={sport}
              onPress={() => toggleSport(sport)}
              style={[styles.option, sports.includes(sport) && styles.optionSelected]}
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
        {errors.sports ? (
          <Text style={styles.fieldError}>{errors.sports}</Text>
        ) : null}

        <Text style={styles.label}>Disponibilités</Text>
        <Text style={styles.helper}>
          Indique l'heure de début et de fin, par exemple 18:00 et 20:00.
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
          placeholder="Début (ex : 18:00)"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          editable={!pending}
          style={styles.input}
        />
        <TextInput
          value={end}
          onChangeText={setEnd}
          placeholder="Fin (ex : 20:00)"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          editable={!pending}
          style={styles.input}
        />
        <Pressable style={styles.secondaryButton} onPress={addAvailability}>
          <Text style={styles.secondaryButtonText}>Ajouter cette disponibilité</Text>
        </Pressable>
        {availability.map((item, index) => (
          <View key={`${item.day}-${item.start}-${item.end}-${index}`} style={styles.availability}>
            <Text style={styles.availabilityText}>
              {dayLabel(item.day)} : {formatMinutes(item.start)} -{" "}
              {formatMinutes(item.end)}
            </Text>
            <Pressable onPress={() => removeAvailability(index)}>
              <Text style={styles.removeText}>Retirer</Text>
            </Pressable>
          </View>
        ))}
        {errors.availability ? (
          <Text style={styles.fieldError}>{errors.availability}</Text>
        ) : null}

        <Text style={styles.label}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={(value) => {
            touch();
            setBio(value);
          }}
          placeholder="Présente-toi..."
          multiline
          maxLength={LIMITS.bioMax}
          editable={!pending}
          style={[styles.input, styles.bioInput]}
        />
        <Text style={styles.counter}>
          {bio.trim().length}/{LIMITS.bioMax}
        </Text>
        {errors.bio ? <Text style={styles.fieldError}>{errors.bio}</Text> : null}

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pending && styles.buttonDisabled,
            pressed && !pending && styles.buttonPressed,
          ]}
          onPress={handleSave}
          disabled={pending}
        >
          <Text style={styles.buttonText}>
            {pending ? "Enregistrement..." : "Enregistrer mon profil"}
          </Text>
        </Pressable>

        {logoutError ? <Text style={styles.fieldError}>{logoutError}</Text> : null}

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={signingOut || pending}
        >
          <Text style={styles.logoutText}>
            {signingOut ? "Déconnexion..." : "Se déconnecter"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 50,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 16,
    color: colors.textMuted,
  },

  banner: {
    backgroundColor: colors.warningSurface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  bannerText: {
    color: colors.warningText,
    lineHeight: 20,
  },

  back: {
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 8,
  },

  label: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },

  helper: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginTop: 8,
  },

  bioInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },

  counter: {
    textAlign: "right",
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
  },

  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },

  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  optionText: {
    color: colors.text,
    fontWeight: "600",
  },

  optionTextSelected: {
    color: colors.onPrimary,
  },

  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },

  availability: {
    backgroundColor: colors.infoSurface,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  availabilityText: {
    color: colors.infoText,
    fontWeight: "600",
    flex: 1,
  },

  removeText: {
    color: colors.danger,
    fontWeight: "700",
  },

  fieldError: {
    color: colors.danger,
    marginTop: 6,
  },

  formError: {
    marginTop: 20,
    color: colors.danger,
    backgroundColor: colors.dangerSurface,
    borderRadius: 12,
    padding: 14,
    lineHeight: 20,
  },

  button: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  logoutButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },

  logoutText: {
    color: colors.danger,
    fontWeight: "700",
  },
});
}
