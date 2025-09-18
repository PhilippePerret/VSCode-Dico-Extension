# Plan de refactorisation des types - Architecture unifiée

## Problèmes actuels
- 15+ types différents pour gérer Entry/Oeuvre/Exemple
- Duplication entre extension/webview 
- Types partiels et incohérents
- Confusion entre données persistantes/volatiles/UI

## Architecture cible

### Nomenclature unifiée
Tous les types finissent par `Type` pour éviter confusion avec classes :

```typescript
// Types principaux
EntryType, OeuvreType, ExempleType

// Types composants  
DBEntryType, DBOeuvreType, DBExempleType
CachedEntryType, CachedOeuvreType, CachedExempleType
DomStateType (partagé)
```

### Structure type principal
```typescript
interface EntryType {
  dbData: DBEntryType;           // Données persistantes (base + édition)
  cachedData: CachedEntryType;   // Données volatiles (affichage + filtrage)
  domState: DomStateType;        // État UI (selected, display)
}
```

### Types spécifiques par entité

#### Entry
```typescript
interface DBEntryType {
  id: string;
  entree: string;
  genre: string;
  categorie_id?: string;
  definition: string;
}

interface CachedEntryType {
  entree_min: string;
  entree_min_ra: string;
  categorie_formated?: string;
  genre_formated?: string;
  definition_formated?: string;
}
```

#### Oeuvre & Exemple
- Même pattern avec leurs propres champs spécifiques

#### DomState (partagé)
```typescript
interface DomStateType {
  selected: boolean;
  display: 'block' | 'none';
}
```

## Plan d'implémentation

### Phase 1: Création des nouveaux types
1. Créer `bothside/types/` avec tous les nouveaux types
2. Définir les types DB, Cached et DomState
3. Assembler les types principaux (EntryType, etc.)

### Phase 2: Migration progressive
1. **Extension** : Adapter les modèles un par un
2. **Base de données** : Adapter les méthodes toRow/fromRow  
3. **Cache** : Adapter prepareItemForCache et finalizeCachedItems
4. **Webviews** : Adapter ClientItem et PanelClient

### Phase 3: Nettoyage
1. Supprimer les anciens types (IEntry, FullEntry, etc.)
2. Nettoyer les imports
3. Vérifier la cohérence

## Défis attendus
- **Interdépendances** : Types utilisés partout
- **Timing** : Cache et serialization
- **Héritage** : Classes extension vs webview
- **Backward compatibility** : Messages RPC

## Usage réel reflété
```typescript
// Édition/DB
entry.dbData.entree

// Affichage/Filtrage  
entry.cachedData.entree_min

// État UI
entry.domState.selected
```

Cette structure reflète l'usage réel : 3 responsabilités distinctes avec accès sémantique.