# Limites connues

## Socle

- La salle est choisie une fois. La changer demanderait de décider du sort des demandes, relations et séances déjà créées.
- Un membre ne peut pas être bloqué.
- Deux demandes distinctes peuvent viser le même partenaire et le même créneau. L'identifiant stable empêche seulement de rejouer le même envoi.
- Le chat affiche 50 messages. Il n'y a pas de pagination.
- Une relation ne se supprime pas.
- Les règles du dépôt doivent être publiées dans la console. Tant qu'elles ne le sont pas, Firestore refuse les écritures.

## Téléphone

- La photo reste sur l'appareil qui l'a enregistrée. Elle n'apparaît pas chez l'autre compte.
- Le rappel est une notification locale, pas une notification push. Il ne sonne pas sur l'autre téléphone.
- Dans Expo Go sur Android, la création du canal « Rappels » peut échouer. Le rappel est alors programmé sur le canal par défaut.
- Sur le navigateur, le rappel et l'ajout au calendrier indiquent qu'il faut utiliser le téléphone.
- Si Android recharge l'application pendant l'autorisation du calendrier, l'événement est ajouté au retour sur Séances.
- La déconnexion annule les rappels de ce compte. Elle ne retire pas les événements déjà posés dans le calendrier.

## Vérification

Le 24 novembre 2026, la recette T01 à T11 a été exécutée sur les émulateurs Auth et Firestore, avec les services de l'application. Le détail est dans `docs/tests.md`.

T12 n'a pas pu couper le réseau : l'émulateur accepte encore l'écriture après `disableNetwork`. La reprise n'a toutefois créé qu'une séance. L'erreur visible de coupure reste à vérifier sur le téléphone.
