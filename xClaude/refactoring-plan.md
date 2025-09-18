# Plan de Refactorisation Architecturale

## Objectif
Éliminer la dépendance circulaire AccessTable ↔ Entry/Oeuvre/Exemple en transformant ces classes en façades statiques travaillant avec les types purs.

## Étape 1: AccessTable
- [x] Supprimer imports Entry/Oeuvre/Exemple  
- [ ] Changer `AccessTable<T extends Entry | Oeuvre | Exemple>` en `AccessTable<T extends EntryType | OeuvreType | ExempleType>`
- [ ] Modifier `createNewAccedableItem` pour retourner le type au lieu de l'instance
- [ ] Adapter tous les paramètres/retours de méthodes (instances → types)

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