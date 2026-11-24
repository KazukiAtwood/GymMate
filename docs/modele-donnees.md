# Modèle de données

Firestore relie les documents par des identifiants. L'e-mail et le mot de passe restent dans Authentication. Le profil partagé ne contient pas l'e-mail.

Les instants sont des `Timestamp`. Les dates de création utilisent `serverTimestamp()`.

## gyms/{gymId}

Catalogue préparé dans la console. L'application ne peut pas l'écrire.

| Champ | Rôle |
| --- | --- |
| name | Nom affiché. |
| city | Ville, utilisée par la recherche. |
| address | Adresse fictive. |
| createdAt | Date de création du document. |

Identifiants du sujet : `gym_sqy`, `gym_versailles`, `gym_paris`.

## users/{uid}

`uid` est l'identifiant Authentication.

| Champ | Règle |
| --- | --- |
| displayName | 2 à 40 caractères. |
| city | 2 à 60 caractères une fois le profil complété. Vide dans le brouillon initial. |
| level | `beginner`, `intermediate` ou `advanced`. Vide dans le brouillon. |
| goal | Texte requis, 80 caractères au plus. |
| sports | Liste parmi Musculation, Fitness, Running, Cardio, CrossFit, Boxe. |
| availability | Liste d'au plus 14 créneaux. Chaque créneau a `day` de 1 à 7, `start` et `end` en minutes depuis minuit, avec `0 ≤ start < end ≤ 1440`. L'écran demande une heure, par exemple 18:00, puis la convertit. |
| bio | Facultatif, 280 caractères au plus. |
| gymId | `null` tant qu'aucune salle n'est choisie, puis identifiant d'une salle existante. Il ne change plus ensuite. |
| createdAt | Date de création, conservée lors des mises à jour. |
| updatedAt | Date de la dernière écriture. |

Un profil incomplet peut exister sans salle. Le choix de salle exige un nom, une ville, un niveau, un objectif, un sport et une disponibilité.

## trainingRequests/{requestId}

| Champ | Rôle |
| --- | --- |
| senderId | UID de l'expéditeur, égal au compte connecté à la création. |
| receiverId | UID de l'autre membre, différent de l'expéditeur. |
| members | Les deux UID. |
| gymId | Salle commune, qui doit exister. |
| sport | Un sport de la liste autorisée. |
| startsAt | Début du créneau, dans le futur au moment de l'envoi. |
| endsAt | Fin, après le début. |
| timeZone | `Europe/Paris`. |
| message | Texte facultatif, 500 caractères au plus. |
| status | `pending`, puis `accepted` ou `rejected`. |
| createdAt | Date serveur de création. |
| respondedAt | `null` tant que la demande est en attente, puis date serveur de la réponse. |

Seul le destinataire peut répondre, et seulement tant que le statut est `pending`. Les autres champs restent fixes. Une nouvelle tentative du même envoi réutilise le même identifiant.

## relations/{pairId}

`pairId` est le couple d'UID trié et joint par `__`.

| Champ | Rôle |
| --- | --- |
| members | Les deux UID, triés. |
| gymId | Salle de la demande acceptée. |
| sourceRequestId | Première demande qui a créé la relation. |
| createdAt | Date serveur. |

La relation est créée par le destinataire, dans la transaction d'acceptation. Elle n'est ni modifiée ni supprimée. Une demande suivante entre les mêmes personnes réutilise cette relation.

## chats/{pairId}

Même identifiant que la relation.

| Champ | Rôle |
| --- | --- |
| relationId | Égal à `pairId`. |
| members | Les deux UID de la relation. |
| createdAt | Date serveur. |

Le document n'est pas mis à jour. Il n'y a pas de champ `lastMessage` dans cette version.

## chats/{pairId}/messages/{id}

| Champ | Rôle |
| --- | --- |
| senderId | UID connecté, membre du chat. |
| text | Texte nettoyé, de 1 à 1 000 caractères, pas uniquement des espaces. |
| createdAt | Date serveur. |

Un message ne peut plus être modifié ni supprimé. L'écran écoute les 50 derniers, du plus récent au plus ancien, puis les réaffiche dans l'ordre chronologique. L'envoi en cours réutilise la même référence.

## trainingSessions/{requestId}

L'identifiant de la séance est celui de la demande acceptée.

| Champ | Rôle |
| --- | --- |
| requestId | Égal à l'identifiant du document. |
| relationId | `pairId` des deux participants. |
| members | Les deux UID. |
| gymId | Salle de la demande. |
| sport | Sport de la demande. |
| startsAt · endsAt | Créneau copié depuis la demande. |
| timeZone | `Europe/Paris`. |
| status | `planned`, puis `cancelled`, ou `done` seulement après `endsAt`. |
| createdAt · updatedAt | Dates serveur. |

## Données qui restent sur le téléphone

| Donnée | Emplacement |
| --- | --- |
| Photo de profil | Fichier `avatars/{uid}/photo.jpg` ou `photo.png`, chemin dans AsyncStorage sous `avatar:{uid}`. |
| Rappel de séance | Identifiant de notification sous `reminder:{uid}:{sessionId}`. |
| Événement de calendrier | Identifiant sous `calendar:{uid}:{sessionId}`. |
| Thème clair ou sombre | `gymmate-theme`. |

Ces données ne sont pas dans Firestore. L'autre compte ne les voit pas.
