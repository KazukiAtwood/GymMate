import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

process.env.EXPO_PUBLIC_FIREBASE_API_KEY = "demo-api-key";
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = "demo-gymmate.firebaseapp.com";
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = "demo-gymmate";
process.env.EXPO_PUBLIC_FIREBASE_APP_ID = "demo-app-id";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
const [firestoreName, firestorePortText] = firestoreHost.split(":");
const firestorePort = Number(firestorePortText);

const results = [];

function record(id, ok, expected, observed) {
  results.push({ id, ok, expected, observed });
  console.log(`${ok ? "OK" : "KO"} ${id} — ${observed}`);
}

function errorText(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function errorCode(error) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    return typeof code === "string" ? code : "";
  }

  return "";
}

function futureSlot() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(18, 0, 0, 0);
  const end = new Date(start);
  end.setHours(19, 0, 0, 0);
  return { start, end };
}

function denied(error) {
  const code = errorCode(error);
  return code === "permission-denied" || code.endsWith("permission-denied");
}

const password = randomBytes(18).toString("base64url");

const { initializeTestEnvironment } = await import("@firebase/rules-unit-testing");
const { Timestamp, collection, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc, limit, disableNetwork, enableNetwork, getDocs, where } =
  await import("firebase/firestore");
const {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  signInWithEmailAndPassword,
  signOut,
} = await import("./stubs/firebase-auth.mjs");
const { getApp, initializeApp } = await import("firebase/app");
const { getFirestore, connectFirestoreEmulator } = await import("firebase/firestore");

const testEnv = await initializeTestEnvironment({
  projectId: "demo-gymmate",
  firestore: {
    rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
    host: firestoreName,
    port: firestorePort,
  },
});

await testEnv.clearFirestore();
await testEnv.withSecurityRulesDisabled(async (context) => {
  const database = context.firestore();
  const createdAt = Timestamp.now();

  await database.doc("gyms/gym_sqy").set({
    name: "Campus Gym SQY",
    city: "Guyancourt",
    address: "Adresse fictive, hors voie réelle",
    createdAt,
  });
  await database.doc("gyms/gym_paris").set({
    name: "Campus Training Paris",
    city: "Paris",
    address: "Adresse fictive, hors voie réelle",
    createdAt,
  });
  await database.doc("gyms/gym_versailles").set({
    name: "Studio Forme Versailles",
    city: "Versailles",
    address: "Adresse fictive, hors voie réelle",
    createdAt,
  });
});

const { auth, db } = await import("../src/services/firebase.js");
const { createInitialProfile, getUserProfile, listGymMembers, updateSportProfile } =
  await import("../src/services/profileService.ts");
const { chooseGym } = await import("../src/services/gymService.ts");
const {
  acceptTrainingRequest,
  createTrainingRequestRef,
  listReceivedRequests,
  listSentRequests,
  rejectTrainingRequest,
  sendTrainingRequest,
} = await import("../src/services/requestService.ts");
const { getRelation, listRelations } = await import("../src/services/relationService.ts");
const { listSessions } = await import("../src/services/sessionService.ts");
const { chatTextError, createChatMessageRef, sendChatMessage, subscribeToChatMessages } =
  await import("../src/services/chatService.ts");
const { canonicalPair } = await import("../src/utils/pairId.ts");

connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
connectFirestoreEmulator(db, firestoreName, firestorePort);

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function listenerApp(name) {
  const app = initializeApp(firebaseConfig, name);
  const listenerAuth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(listenerAuth, `http://${authHost}`, { disableWarnings: true });
  const listenerDb = getFirestore(app);
  connectFirestoreEmulator(listenerDb, firestoreName, firestorePort);
  return { listenerAuth, listenerDb };
}

async function asUser(email) {
  if (auth.currentUser) {
    await signOut(auth);
  }

  await signInWithEmailAndPassword(auth, email, password);
}

async function createAccount(email, displayName, profile, gymId) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;
  await createInitialProfile(uid, displayName);
  await updateSportProfile(uid, profile);
  await chooseGym(uid, gymId);
  await signOut(auth);
  return uid;
}

function profileFor(displayName, city, level, goal) {
  return {
    displayName,
    city,
    level,
    goal,
    sports: ["Fitness"],
    availability: [{ day: 1, start: 18 * 60, end: 20 * 60 }],
    bio: "Compte de recette",
  };
}

function waitForMessage(database, chatId, text) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Message absent : ${text}`));
    }, 8000);
    const unsubscribe = onSnapshot(
      query(collection(database, "chats", chatId, "messages"), orderBy("createdAt", "desc"), limit(50)),
      (snapshot) => {
        const found = snapshot.docs.some((item) => item.data().text === text);

        if (found) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      },
      (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      },
    );
  });
}

try {
  const linaEmail = "lina.recette@gymmate.test";
  const samiEmail = "sami.recette@gymmate.test";
  const noraEmail = "nora.recette@gymmate.test";
  const linaUid = await createAccount(
    linaEmail,
    "Lina",
    profileFor("Lina", "Guyancourt", "beginner", "Remise en forme"),
    "gym_sqy",
  );
  const samiUid = await createAccount(
    samiEmail,
    "Sami",
    profileFor("Sami", "Guyancourt", "intermediate", "Régularité"),
    "gym_sqy",
  );
  const noraUid = await createAccount(
    noraEmail,
    "Nora",
    profileFor("Nora", "Paris", "beginner", "Cardio"),
    "gym_paris",
  );

  await asUser(linaEmail);
  const linaAgain = await getUserProfile(linaUid);
  record(
    "T01",
    linaAgain?.displayName === "Lina" && linaAgain.gymId === "gym_sqy" && auth.currentUser?.uid === linaUid,
    "Profil conservé après une nouvelle connexion.",
    `Profil ${linaAgain?.displayName ?? "absent"}, salle ${linaAgain?.gymId ?? "absente"}, uid ${auth.currentUser?.uid === linaUid ? "Lina" : "autre"}.`,
  );

  await asUser(samiEmail);
  const samiProfile = await getUserProfile(samiUid);
  const samiSent = await listSentRequests(samiUid);
  record(
    "T02",
    auth.currentUser?.uid === samiUid && samiProfile?.displayName === "Sami" && samiSent.length === 0,
    "La session de Sami ne contient pas les données de Lina.",
    `Connecté ${samiProfile?.displayName ?? "inconnu"}, demandes envoyées ${samiSent.length}.`,
  );

  await asUser(linaEmail);
  const members = await listGymMembers("gym_sqy", linaUid);
  const memberIds = members.map((member) => member.id);
  let noraRead = "lecture autorisée";

  try {
    const noraSnap = await getDoc(doc(db, "users", noraUid));
    noraRead = noraSnap.exists() ? "document lu" : "document vide";
  } catch (error) {
    noraRead = denied(error) ? "permission-denied" : errorText(error);
  }

  record(
    "T03",
    memberIds.includes(samiUid) && !memberIds.includes(linaUid) && !memberIds.includes(noraUid) && noraRead === "permission-denied",
    "Lina voit Sami, pas elle-même, et la fiche de Nora est refusée.",
    `Membres ${memberIds.join(", ") || "aucun"}. Fiche Nora : ${noraRead}.`,
  );

  const slot = futureSlot();
  const requestRef = createTrainingRequestRef();
  const created = await sendTrainingRequest(requestRef, {
    senderId: linaUid,
    receiverId: samiUid,
    sport: "Musculation",
    startsAt: slot.start,
    endsAt: slot.end,
    message: "Demain 18 h ?",
  });
  const repeated = await sendTrainingRequest(requestRef, {
    senderId: linaUid,
    receiverId: samiUid,
    sport: "Musculation",
    startsAt: slot.start,
    endsAt: slot.end,
    message: "Demain 18 h ?",
  });
  const linaSent = await listSentRequests(linaUid);
  await asUser(samiEmail);
  const samiReceived = await listReceivedRequests(samiUid);
  record(
    "T04",
    created.status === "created" &&
      repeated.status === "already-exists" &&
      repeated.id === created.id &&
      linaSent.filter((item) => item.id === created.id).length === 1 &&
      samiReceived.filter((item) => item.id === created.id).length === 1,
    "Une seule demande, visible des deux côtés.",
    `Création ${created.status}, reprise ${repeated.status}, envoyées ${linaSent.length}, reçues ${samiReceived.length}.`,
  );

  await asUser(linaEmail);
  let selfResult = "non tenté";

  try {
    await sendTrainingRequest(createTrainingRequestRef(), {
      senderId: linaUid,
      receiverId: linaUid,
      sport: "Fitness",
      startsAt: slot.start,
      endsAt: slot.end,
      message: "",
    });
    selfResult = "accepté";
  } catch (error) {
    selfResult = errorText(error);
  }

  let otherGym = "non tenté";

  try {
    await sendTrainingRequest(createTrainingRequestRef(), {
      senderId: linaUid,
      receiverId: noraUid,
      sport: "Fitness",
      startsAt: slot.start,
      endsAt: slot.end,
      message: "",
    });
    otherGym = "accepté";
  } catch (error) {
    otherGym = errorText(error);
  }

  const pastStart = new Date(Date.now() - 60 * 60 * 1000);
  const pastEnd = new Date(Date.now() - 30 * 60 * 1000);
  let pastResult = "non tenté";

  try {
    await sendTrainingRequest(createTrainingRequestRef(), {
      senderId: linaUid,
      receiverId: samiUid,
      sport: "Fitness",
      startsAt: pastStart,
      endsAt: pastEnd,
      message: "",
    });
    pastResult = "accepté";
  } catch (error) {
    pastResult = errorText(error);
  }

  let forgedOtherGym = "non tenté";

  try {
    await setDoc(doc(collection(db, "trainingRequests")), {
      senderId: linaUid,
      receiverId: noraUid,
      members: [linaUid, noraUid],
      gymId: "gym_sqy",
      sport: "Fitness",
      startsAt: Timestamp.fromDate(slot.start),
      endsAt: Timestamp.fromDate(slot.end),
      timeZone: "Europe/Paris",
      message: "",
      status: "pending",
      createdAt: Timestamp.now(),
      respondedAt: null,
    });
    forgedOtherGym = "écriture acceptée";
  } catch (error) {
    forgedOtherGym = denied(error) ? "permission-denied" : errorText(error);
  }

  record(
    "T05",
    selfResult.includes("Tu ne peux pas") &&
      otherGym.includes("pas dans ta salle") &&
      pastResult.includes("créneau") &&
      forgedOtherGym === "permission-denied",
    "Soi-même, autre salle et date passée sont refusés.",
    `Soi : ${selfResult}. Autre salle : ${otherGym}. Passé : ${pastResult}. Règle autre salle : ${forgedOtherGym}.`,
  );

  let forgedSender = "non tenté";

  try {
    await setDoc(doc(collection(db, "trainingRequests")), {
      senderId: samiUid,
      receiverId: linaUid,
      members: [samiUid, linaUid],
      gymId: "gym_sqy",
      sport: "Fitness",
      startsAt: Timestamp.fromDate(slot.start),
      endsAt: Timestamp.fromDate(slot.end),
      timeZone: "Europe/Paris",
      message: "",
      status: "pending",
      createdAt: Timestamp.now(),
      respondedAt: null,
    });
    forgedSender = "écriture acceptée";
  } catch (error) {
    forgedSender = denied(error) ? "permission-denied" : errorText(error);
  }

  let forgedAccept = "non tenté";

  try {
    await updateDoc(doc(db, "trainingRequests", created.id), {
      status: "accepted",
      respondedAt: Timestamp.now(),
    });
    forgedAccept = "écriture acceptée";
  } catch (error) {
    forgedAccept = denied(error) ? "permission-denied" : errorText(error);
  }

  record(
    "T11",
    forgedSender === "permission-denied" && forgedAccept === "permission-denied",
    "Un faux expéditeur et une acceptation par Lina sont refusés.",
    `Faux senderId : ${forgedSender}. Acceptation par Lina : ${forgedAccept}.`,
  );

  await asUser(samiEmail);
  const rejected = await rejectTrainingRequest(created.id, samiUid);
  const pair = canonicalPair(linaUid, samiUid);
  const relationAfterReject = await getRelation(pair.pairId);
  const sessionsAfterReject = await listSessions(samiUid);
  record(
    "T06",
    rejected.status === "rejected" && relationAfterReject === null && sessionsAfterReject.length === 0,
    "Refus sans relation, chat ni séance.",
    `Statut ${rejected.status}, relation ${relationAfterReject ? "présente" : "absente"}, séances ${sessionsAfterReject.length}.`,
  );

  await asUser(linaEmail);
  const acceptedRef = createTrainingRequestRef();
  const acceptedSend = await sendTrainingRequest(acceptedRef, {
    senderId: linaUid,
    receiverId: samiUid,
    sport: "Fitness",
    startsAt: slot.start,
    endsAt: slot.end,
    message: "On tente le créneau.",
  });

  let offlineResult = "non tenté";
  await asUser(samiEmail);
  await disableNetwork(db);

  try {
    await Promise.race([
      acceptTrainingRequest(acceptedSend.id, samiUid),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("délai dépassé")), 8000);
      }),
    ]);
    offlineResult = "accepté hors ligne";
  } catch (error) {
    offlineResult = errorText(error);
  }

  await enableNetwork(db);
  const accepted = await acceptTrainingRequest(acceptedSend.id, samiUid);
  const acceptedAgain = await acceptTrainingRequest(acceptedSend.id, samiUid);
  const sessionsAfterAccept = await listSessions(samiUid);
  const relationsAfterAccept = await listRelations(samiUid);
  record(
    "T12",
    offlineResult.includes("réseau") &&
      accepted.status === "accepted" &&
      accepted.already === false &&
      sessionsAfterAccept.filter((item) => item.id === acceptedSend.id).length === 1,
    "Coupure visible, puis une seule séance à la reprise.",
    `Hors ligne : ${offlineResult}. Reprise ${accepted.status}, séances pour cette demande ${sessionsAfterAccept.filter((item) => item.id === acceptedSend.id).length}.`,
  );
  record(
    "T07",
    acceptedAgain.already === true &&
      acceptedAgain.pairId === pair.pairId &&
      relationsAfterAccept.length === 1 &&
      sessionsAfterAccept.length === 1,
    "Une relation, un chat et une seule séance malgré le second appui.",
    `Second appui already=${acceptedAgain.already}, relations ${relationsAfterAccept.length}, séances ${sessionsAfterAccept.length}.`,
  );

  await asUser(linaEmail);
  const secondRef = createTrainingRequestRef();
  const secondSend = await sendTrainingRequest(secondRef, {
    senderId: linaUid,
    receiverId: samiUid,
    sport: "Running",
    startsAt: new Date(slot.start.getTime() + 24 * 60 * 60 * 1000),
    endsAt: new Date(slot.end.getTime() + 24 * 60 * 60 * 1000),
    message: "Une autre séance.",
  });
  await asUser(samiEmail);
  const secondAccept = await acceptTrainingRequest(secondSend.id, samiUid);
  const sessionsAfterSecond = await listSessions(samiUid);
  const relationsAfterSecond = await listRelations(samiUid);
  record(
    "T08",
    secondAccept.pairId === pair.pairId &&
      relationsAfterSecond.length === 1 &&
      sessionsAfterSecond.length === 2,
    "Même relation, nouvelle séance.",
    `pair ${secondAccept.pairId === pair.pairId ? "identique" : "différent"}, relations ${relationsAfterSecond.length}, séances ${sessionsAfterSecond.length}.`,
  );

  const linaListener = listenerApp("lina-listener");
  const samiListener = listenerApp("sami-listener");
  await signInWithEmailAndPassword(linaListener.listenerAuth, linaEmail, password);
  await signInWithEmailAndPassword(samiListener.listenerAuth, samiEmail, password);
  const samiHears = waitForMessage(samiListener.listenerDb, pair.pairId, "Salut Sami");
  await asUser(linaEmail);
  const emptyMessage = chatTextError("   ");
  let emptySend = "non tenté";

  try {
    await sendChatMessage(createChatMessageRef(pair.pairId), linaUid, "   ");
    emptySend = "envoyé";
  } catch (error) {
    emptySend = errorText(error);
  }

  await sendChatMessage(createChatMessageRef(pair.pairId), linaUid, "Salut Sami");
  await samiHears;
  const linaHears = waitForMessage(linaListener.listenerDb, pair.pairId, "À demain");
  await asUser(samiEmail);
  await sendChatMessage(createChatMessageRef(pair.pairId), samiUid, "À demain");
  await linaHears;
  await asUser(linaEmail);
  const history = await new Promise((resolve, reject) => {
    const unsubscribe = subscribeToChatMessages(
      pair.pairId,
      (messages) => {
        unsubscribe();
        resolve(messages.map((item) => item.text));
      },
      () => {
        unsubscribe();
        reject(new Error("écoute en erreur"));
      },
    );
  });
  record(
    "T09",
    emptyMessage === "Écris un message." &&
      emptySend.includes("Écris un message") &&
      history.includes("Salut Sami") &&
      history.includes("À demain"),
    "Réception directe, historique retrouvé, message vide refusé.",
    `Vide : ${emptyMessage} / ${emptySend}. Historique : ${history.join(" | ")}.`,
  );

  let noraChat = "non tenté";
  let noraMessage = "non tenté";
  await asUser(noraEmail);

  try {
    const chatSnap = await getDoc(doc(db, "chats", pair.pairId));
    noraChat = chatSnap.exists() ? "chat lu" : "chat absent";
  } catch (error) {
    noraChat = denied(error) ? "permission-denied" : errorText(error);
  }

  try {
    const messageSnap = await getDocs(collection(db, "chats", pair.pairId, "messages"));
    noraMessage = `${messageSnap.size} message(s) lu(s)`;
  } catch (error) {
    noraMessage = denied(error) ? "permission-denied" : errorText(error);
  }

  record(
    "T10",
    noraChat === "permission-denied" && noraMessage === "permission-denied",
    "Nora ne lit ni le chat ni les messages.",
    `Chat : ${noraChat}. Messages : ${noraMessage}.`,
  );
} catch (error) {
  record("RECETTE", false, "La recette va au bout.", errorText(error));
  console.error(error);
} finally {
  await testEnv.cleanup();
  const failed = results.filter((item) => !item.ok);
  console.log(`RESULT_JSON ${JSON.stringify(results)}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
