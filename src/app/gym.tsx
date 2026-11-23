import * as Location from "expo-location";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { logoutAccount } from "@/services/authService";
import { chooseGym, listGyms } from "@/services/gymService";
import { profileWriteErrorMessage } from "@/services/profileService";
import type { Gym } from "@/types/gym";
import { distanceKm, formatBirdDistance } from "@/utils/distance";
import { isProfileReady } from "@/utils/profileValidation";

export default function GymScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const showingPosition = mode === "position";
  const { user, profile, refreshProfile } = useAuth();
  const { pending, run } = useSubmitLock();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [position, setPosition] = useState<Location.LocationObjectCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationInfo, setLocationInfo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGyms() {
      setLoading(true);
      setError(null);

      try {
        const nextGyms = await listGyms();

        if (active) {
          setGyms(nextGyms);
        }
      } catch (loadError) {
        console.error("Erreur de lecture des salles :", loadError);

        if (active) {
          setError("Les salles sont indisponibles. Réessayez.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadGyms();

    return () => {
      active = false;
    };
  }, []);

  if (!isProfileReady(profile)) {
    return <Redirect href="/profile" />;
  }

  if (profile?.gymId && !showingPosition) {
    return <Redirect href="/tabs/discover" />;
  }

  const normalizedSearch = search.trim().toLocaleLowerCase("fr");
  const visibleGyms = gyms
    .filter((gym) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        gym.name.toLocaleLowerCase("fr").includes(normalizedSearch) ||
        gym.city.toLocaleLowerCase("fr").includes(normalizedSearch)
      );
    })
    .map((gym) => ({
      ...gym,
      distanceKm:
        position && gym.latitude !== null && gym.longitude !== null
          ? distanceKm(position.latitude, position.longitude, gym.latitude, gym.longitude)
          : null,
    }))
    .sort((left, right) => {
      if (left.distanceKm === null && right.distanceKm === null) {
        return left.name.localeCompare(right.name, "fr");
      }

      if (left.distanceKm === null) {
        return 1;
      }

      if (right.distanceKm === null) {
        return -1;
      }

      return left.distanceKm - right.distanceKm;
    });

  function handleConfirm() {
    if (!user || !selectedGym) {
      return;
    }

    const gymId = selectedGym.id;
    setSaveError(null);

    void run(async () => {
      try {
        await chooseGym(user.uid, gymId);
        const loaded = await refreshProfile();

        if (loaded) {
          router.replace("/tabs/discover");
        }
      } catch (saveFailure) {
        console.error("Erreur de choix de salle :", saveFailure);
        setSaveError(profileWriteErrorMessage(saveFailure));
      }
    });
  }

  async function reloadGyms() {
    setLoading(true);
    setError(null);

    try {
      setGyms(await listGyms());
    } catch (loadError) {
      console.error("Erreur de lecture des salles :", loadError);
      setError("Les salles sont indisponibles. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function useMyPosition() {
    setLocating(true);
    setLocationInfo(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setPosition(null);
        setLocationInfo("Recherchez par ville.");
        return;
      }

      const nextPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPosition(nextPosition.coords);
    } catch (locationError) {
      console.error("Erreur de localisation :", locationError);
      setPosition(null);
      setLocationInfo("La position est indisponible. Recherchez par ville.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choisir une salle</Text>
      <Text style={styles.subtitle}>
        {profile?.gymId
          ? "Ta salle est déjà choisie. Tu peux mesurer ta position ou rechercher par ville."
          : "La salle reste fixe dans cette version. Tu verras ensuite les membres de cette salle."}
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher par nom ou ville"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />

      <Pressable
        style={[styles.secondaryButton, styles.locationButton, locating && styles.buttonDisabled]}
        onPress={() => void useMyPosition()}
        disabled={locating}
      >
        <Text style={styles.secondaryButtonText}>
          {locating ? "Localisation..." : "Utiliser ma position"}
        </Text>
      </Pressable>
      {position ? (
        <Text style={styles.locationText}>
          Latitude {position.latitude.toFixed(5)}, longitude {position.longitude.toFixed(5)}
          {typeof position.accuracy === "number"
            ? `, précision ${Math.round(position.accuracy)} m`
            : ""}
          .
          {" "}
          Classement indicatif, à vol d'oiseau.
        </Text>
      ) : null}
      {locationInfo ? <Text style={styles.locationText}>{locationInfo}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3C87F7" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => void reloadGyms()}>
            <Text style={styles.secondaryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.listView}
          data={visibleGyms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.message}>
              {gyms.length === 0
                ? "Aucune salle n'est disponible pour le moment."
                : "Aucune salle ne correspond à cette recherche."}
            </Text>
          }
          renderItem={({ item }) => {
            const isSelected = selectedGym?.id === item.id;

            return (
              <Pressable
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => {
                  setSelectedGym(item);
                  setSaveError(null);
                }}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardText}>{item.city}</Text>
                {item.address ? (
                  <Text style={styles.cardText}>{item.address}</Text>
                ) : null}
                {item.distanceKm !== null ? (
                  <Text style={styles.distance}>{formatBirdDistance(item.distanceKm)}</Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}

      {selectedGym && !profile?.gymId ? (
        <View style={styles.confirmation}>
          <Text style={styles.confirmationText}>
            Confirmer {selectedGym.name} à {selectedGym.city} ? Ce choix ne
            pourra plus être modifié.
          </Text>
          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
          <Pressable
            style={[styles.button, pending && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={pending}
          >
            <Text style={styles.buttonText}>
              {pending ? "Enregistrement..." : "Confirmer cette salle"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={styles.logoutButton}
        onPress={() => void logoutAccount()}
        disabled={pending}
      >
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
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
    marginTop: 8,
    marginBottom: 16,
    color: "#6B7280",
    lineHeight: 22,
  },

  search: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },

  locationButton: {
    marginTop: 12,
    alignItems: "center",
  },

  locationText: {
    marginTop: 8,
    color: "#4B5563",
    lineHeight: 20,
  },

  distance: {
    marginTop: 8,
    color: "#1E40AF",
    fontWeight: "700",
  },

  list: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },

  listView: {
    flex: 1,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  cardSelected: {
    borderColor: "#3C87F7",
    backgroundColor: "#EFF6FF",
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  cardText: {
    marginTop: 4,
    color: "#4B5563",
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  message: {
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },

  confirmation: {
    paddingTop: 8,
    paddingBottom: 8,
  },

  confirmationText: {
    color: "#1F2937",
    lineHeight: 22,
  },

  error: {
    marginTop: 8,
    color: "#B91C1C",
  },

  button: {
    marginTop: 12,
    backgroundColor: "#3C87F7",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  secondaryButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#3C87F7",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },

  secondaryButtonText: {
    color: "#3C87F7",
    fontWeight: "700",
  },

  logoutButton: {
    alignItems: "center",
    paddingVertical: 14,
  },

  logoutText: {
    color: "#B91C1C",
    fontWeight: "700",
  },
});
