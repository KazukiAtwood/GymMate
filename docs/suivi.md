# Suivi des jalons

## J5 · Identifier

Compte utilisable : inscription, connexion, déconnexion et profil sportif enregistré dans Firestore.

### Ce qui fonctionne

- Inscription avec nom, e-mail, mot de passe et confirmation. Le bouton reste inactif pendant l'envoi.
- Création de `users/{uid}` avec `gymId: null`, puis complétion du profil sportif.
- Si le compte est créé mais que le document profil échoue, l'utilisateur reprend le formulaire sans nouvelle inscription.
- Connexion, restauration de session au lancement, et déconnexion qui retire l'accès aux écrans privés.
- Le profil est prérempli depuis Firestore et réenregistré avec `updateDoc`.
- Un profil incomplet reste sur le formulaire. Un profil complet ouvre les onglets.
- Le choix de salle reste pour le J6 : `gymId` reste `null` et n'est pas modifiable.

### Test réalisé

Vérification TypeScript du projet (`npx tsc --noEmit`).

Parcours à refaire sur l'appareil, avec `.env.local` renseigné et `firestore.rules` publié :

1. Créer le compte A (Lina) et enregistrer un profil complet.
2. Fermer puis rouvrir l'application : la session et le profil sont toujours là.
3. Se déconnecter, puis se reconnecter avec un mauvais mot de passe : message générique, formulaire à nouveau utilisable.
4. Depuis le profil, se déconnecter : l'accueil s'affiche, et un lien direct vers Découvrir ne reste pas ouvert.

### Difficulté

Les règles Firestore du dépôt doivent être publiées dans la console. Tant qu'elles ne le sont pas, l'enregistrement du profil est refusé et l'écran l'indique.

## J6 · Découvrir

Choix d'une salle, puis lecture des autres membres de cette salle.

### Ce qui fonctionne

- Les salles sont lues depuis `gyms` et filtrées localement par nom ou ville.
- La confirmation enregistre `users/{uid}.gymId` une seule fois. Le document de salle doit exister et le profil sportif doit être complet.
- Découvrir charge les profils `where gymId ==` la salle courante et retire le compte connecté.
- La fiche membre affiche les informations sportives. Un membre d'une autre salle est refusé par les règles.
- Une salle vide propose un message et un rechargement.

### Test réalisé

Vérification TypeScript (`npx tsc --noEmit`).

À refaire avec deux comptes après publication des règles :

1. A et B choisissent Campus Gym SQY. C choisit Campus Training Paris.
2. A voit B dans Découvrir, pas son propre profil, pas C.
3. A ouvre la fiche de B. Un accès direct au profil de C est refusé.
4. Le profil de A affiche le nom de la salle choisie.

### Difficulté

Les règles du J5 refusaient encore tout `gymId` non nul. Elles sont mises à jour dans `firestore.rules` et doivent être republiées avant le choix de salle.

## J7 · Demander

Envoi d'une demande d'entraînement et listes reçues / envoyées.

### Ce qui fonctionne

- Depuis la fiche d'un membre de la même salle, on propose un sport, une date et un créneau.
- Le document `trainingRequests` est créé avec le statut `pending`, les deux participants et `timeZone: Europe/Paris`.
- Une nouvelle tentative du même envoi réutilise le même identifiant.
- L'onglet Demandes sépare Reçues et Envoyées, avec le badge En attente, Acceptée ou Refusée.
- Les règles n'autorisent la lecture qu'aux deux participants. Accepter ou refuser reste le J8.

### Test à faire

Après publication des règles : Patrick propose à Sami Musculation demain de 18:00 à 19:00. La demande apparaît dans Envoyées chez Patrick et dans Reçues chez Sami. Une date passée est refusée. Un deuxième appui ne crée pas une deuxième demande.

## J8 · Relier

Accepter une demande crée, dans une seule transaction, la relation, le chat et la séance. Refuser ne change que la demande.

### Ce qui fonctionne

- Le destinataire accepte ou refuse une demande encore `pending`.
- L'acceptation lit la demande et la relation, puis écrit le statut `accepted`, `relations/{pairId}`, `chats/{pairId}` et `trainingSessions/{requestId}`.
- `pairId` est le couple d'UID trié, joint par `__`. Une deuxième séance entre les mêmes personnes réutilise la relation et le chat.
- Une acceptation déjà enregistrée ne crée pas une deuxième séance. Un créneau passé ne peut plus être accepté.
- Un refus passe la demande à `rejected` et laisse une relation déjà existante inchangée.
- Mes relations liste les partenaires et ouvre le chat. Mes séances sépare À venir et Historique.
- Un participant peut annuler une séance planifiée, ou la marquer terminée après l'heure de fin.

### Test à faire

Après republication de `firestore.rules` :

1. Sami refuse une demande de Patrick : statut Refusée, rien dans Relations ni Séances.
2. Sami accepte une autre demande : une relation, un chat et une séance visibles des deux côtés.
3. Un deuxième appui sur Accepter ne crée pas une autre séance.
4. Une nouvelle demande acceptée ajoute une séance et conserve la même relation.
5. Patrick annule la séance : Sami voit Annulée dans Historique après actualisation.

### Difficulté

Les règles doivent être republiées. L'envoi des messages du chat reste le J9 : la conversation s'ouvre et n'a pas encore de saisie.

## Atelier 1 et 2 · Téléphone et position

Les modules `expo-location`, `expo-image-picker`, `expo-notifications` et `expo-file-system` sont installés. Les textes de permission sont dans `app.json`. Aucune demande d'accès n'est lancée à l'ouverture.

### Ce qui fonctionne

- Le choix de salle garde la recherche par nom ou ville.
- **Utiliser ma position** demande l'accès seulement après l'appui.
- Si l'accès est refusé, le message indique de rechercher par ville et le bouton redevient utilisable.
- Si la mesure réussit, la latitude, la longitude et la précision s'affichent.

## Atelier 3 · Salles par proximité

SQY est placée à 48,77 / 2,08 et Paris à 48,86 / 2,35. Une salle sans coordonnées reste dans la liste.

### Ce qui fonctionne

- Avec une position, une copie du catalogue est triée par distance à vol d'oiseau.
- La distance affichée est arrondie au kilomètre.
- Sans position, les salles restent dans l'ordre alphabétique et la recherche par ville fonctionne.
- La salle la plus proche n'est pas choisie toute seule : la confirmation reste manuelle.

### Test à faire

1. Sans position, chercher Guyancourt : les salles restent consultables.
2. Mesurer une position exactement sur SQY : Campus Gym SQY arrive en tête, à 0 km.
3. Confirmer une autre salle que la plus proche : c'est ce choix qui est enregistré.

## Atelier 4 et 5 · Photo locale

La photo n'est pas envoyée à Firebase. Elle est copiée dans les fichiers de l'application, sous `avatars/{uid}/photo.jpg` ou `photo.png`, et le chemin est gardé sur le téléphone.

### Ce qui fonctionne

- **Prendre une photo** et **Galerie** demandent l'accès seulement après l'appui.
- L'aperçu s'affiche avant l'enregistrement. **Annuler**, ou annuler la galerie, garde la photo déjà enregistrée.
- Seules les images JPEG ou PNG de 3 Mo au plus sont acceptées.
- Si la copie réussit mais que le chemin n'est pas retenu, **Confirmer** réessaie seulement cette liaison.

### Test à faire

1. Choisir une photo, annuler : l'ancienne photo reste.
2. Confirmer une photo, quitter le profil, revenir : elle est toujours là.
3. Refuser l'appareil photo : le message propose la galerie.

## Atelier 6 et 7 · Rappel local

Le rappel est programmé sur le téléphone, pas dans Firestore.

### Ce qui fonctionne

- **Me rappeler** demande l'accès aux notifications seulement après l'appui.
- Le rappel est placé 15 minutes avant le début. Une échéance déjà passée est refusée.
- L'identifiant est gardé sur l'appareil dans `reminder:{uid}:{sessionId}`.
- **Annuler le rappel** retire cet identifiant. Annuler la séance ou se déconnecter retire les rappels de ce compte, pas les autres.
- Au premier plan, la notification peut s'afficher. Elle n'arrive pas sur l'autre téléphone.

### Test à faire

1. Programmer un rappel sur une séance future, mettre l'application en arrière-plan.
2. Annuler le rappel avant l'heure : il ne doit plus être programmé.

## Calendrier

**Au calendrier** ajoute la séance planifiée dans le calendrier du téléphone. L'accès est demandé seulement après l'appui. Une séance déjà ajoutée n'est pas dupliquée. Annuler la séance retire aussi cet événement. Sur le navigateur, le bouton indique que l'ajout se fait sur le téléphone. Si Android recharge l'application au moment de l'autorisation, l'événement est ajouté au retour sur Séances. Dans Expo Go, le canal « Rappels » peut être indisponible : le rappel est alors programmé sur le canal par défaut.



