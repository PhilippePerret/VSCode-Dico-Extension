# Plan de Refactorisation Architecturale

## Objectif
Éliminer la dépendance circulaire AccessTable ↔ Entry/Oeuvre/Exemple en transformant ces classes en façades statiques travaillant avec les types purs.

## Avancement du 18/12/2024
- AccessTable simplifié par Philippe : suppression de traverseAnyTypeWith, tout fonctionne avec des IDs
- AccessTable<T extends EntryType | OeuvreType | ExempleType> ✓
- createNewAccedableItem partiellement modifié mais TODO sur le placement ordonné des items
- PROBLÈME ACTUEL : firstItem undefined car arrayItems vide → AUCUN ITEM N'EST CHARGÉ
- firstItem n'est que le révélateur, pas la cause. Si items étaient chargés, on les verrait dans la fenêtre
- VRAIE QUESTION : Pourquoi aucun item n'est chargé ? 
- SOLUTION : Reprendre le chemin depuis la base de données jusqu'au panneau
- Objectif demain : tracer le flux de chargement des données dans l'économie

## Étape 1: AccessTable
- [x] Supprimer imports Entry/Oeuvre/Exemple  
- [x] Changer `AccessTable<T extends Entry | Oeuvre | Exemple>` en `AccessTable<T extends EntryType | OeuvreType | ExempleType>`
- [ ] Fixer firstItem undefined → corriger le chargement des items
- [ ] Modifier `createNewAccedableItem` pour retourner le type au lieu de l'instance (avec tri ordonné)

## Étape 2: Entry (puis Oeuvre, Exemple)
- [ ] Supprimer `extends ClientItem`
- [ ] Supprimer constructor/instances
- [ ] Convertir toutes les méthodes en statiques
- [ ] Supprimer les getters `get id()` etc.
- [ ] Définir `static accessTable: AccessTable<EntryType>`

## Étape 3: Adaptation du code utilisateur
- [ ] Remplacer `new Entry(data)` par usage direct des types EntryType
- [ ] Remplacer `entry.id` par `entryType.id` (accès direct)
- [ ] Remplacer `entry.data.xxx` par `entryType.xxx`

## Étape 4: ClientItem
- [ ] Évaluer si ClientItem devient obsolète
- [ ] Migrer les méthodes statiques utiles vers Entry/Oeuvre/Exemple
- [ ] Supprimer ClientItem si plus nécessaire

## Validation
- [ ] Compilation sans erreur
- [ ] Plus de dépendance circulaire
- [ ] AccessTable n'est plus undefined dans les bundles
- [ ] Les données se chargent correctement