# Recette GymMate

Comptes de cette exécution : Lina et Sami dans `gym_sqy`, Nora dans `gym_paris`. Ils ont été créés dans l'émulateur Auth, pas dans le projet Firebase de la classe.

La recette appelle les services de l'application (`profileService`, `requestService`, `chatService`, `relationService`, `sessionService`) et les règles de `firestore.rules`. Ce n'est pas un parcours cliqué sur le téléphone : la restauration de session par AsyncStorage et une vraie coupure réseau du téléphone ne sont pas reproduites ici.

Commande, avec Java 21 disponible :

```bash
npx firebase-tools emulators:exec --project demo-gymmate --only auth,firestore "node --experimental-strip-types --import ./scripts/register.mjs scripts/recipe.mjs"
```

## Résultats du 24 novembre 2026

| Test | Résultat attendu | Résultat observé | Statut |
| --- | --- | --- | --- |
| T01 · Compte et reconnexion | Le profil reste après une nouvelle connexion. | Déconnexion puis reconnexion de Lina : profil Lina, salle `gym_sqy`. | OK |
| T02 · Passage de A à B | La session de Sami ne reprend pas les données de Lina. | Connecté en tant que Sami, aucune demande envoyée. | OK |
| T03 · Membres de la salle | Lina voit Sami, pas elle-même. Nora est inaccessible. | La liste de `gym_sqy` contient Sami seulement. La lecture du profil de Nora renvoie `permission-denied`. | OK |
| T04 · Demande et double appui | Une seule demande, des deux côtés. | Premier envoi créé, second envoi `already-exists`. Une envoyée, une reçue. | OK |
| T05 · Demandes interdites | Soi-même, autre salle et date passée refusés. | Message « Tu ne peux pas t'envoyer une demande. », « Cette personne n'est pas dans ta salle. », créneau passé refusé. Une écriture directe vers Nora est `permission-denied`. | OK |
| T06 · Refus | Statut rejeté, rien d'autre créé. | `rejected`. Aucune relation, aucune séance. | OK |
| T07 · Acceptation | Une relation, un chat, une séance. Le second appui ne duplique pas. | Second appui `already=true`. 1 relation, 1 séance. | OK |
| T08 · Deuxième séance | Même relation, nouvelle séance. | Même `pairId`. 1 relation, 2 séances. | OK |
| T09 · Messages | Réception directe, historique, message vide refusé. | Sami reçoit « Salut Sami » sans rechargement, Lina reçoit « À demain ». L'historique contient les deux. «    » est refusé : « Écris un message. » | OK |
| T10 · Accès de C | Nora ne lit ni n'écrit dans le chat. | Chat et messages : `permission-denied`. | OK |
| T11 · Écriture forgée | Faux `senderId` ou acceptation par Lina refusés. | Les deux écritures sont `permission-denied`. | OK |
| T12 · Réseau coupé | Erreur visible, reprise sans doublon. | `disableNetwork` n'a pas coupé l'émulateur : l'acceptation est passée. La reprise n'a créé qu'une séance. L'erreur visible reste à provoquer sur le téléphone en coupant le réseau. | Partiel |

## Correction trouvée par T05

Une demande vers un membre d'une autre salle faisait échouer la lecture de son profil avant le message prévu. L'envoi affiche maintenant « Cette personne n'est pas dans ta salle. »
