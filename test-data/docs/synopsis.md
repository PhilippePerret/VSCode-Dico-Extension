# Synopsis de programmation

## Démarrage

* La commande appelle la fonction `PanelManager.openPanels`

  Elle crée les trois panneaux avec les éléments minimum, mais aucune données.

  À la fin de cette fonction est appelé sur chaque élément :
  
  * `panelManager.cacheData` pour mettre les données brut en cache (`Entry`, `Oeuvre` et `Exemple`) et : 
  * `panelManager.populatePanel` pour peupler les panneaux c'est-à-dire afficher les données.

* … appel de `panelManager.cacheData(context, panneau, classe)`

  La méthode charge les données depuis la base de données avec `<classe>Db.getAll()`.

  Puis elle envoie un message `cacheData` à la webview, message reçu par `webview/common.ts` qui appelle alors la méthode générale `cacheAllData` avec les items et le panneau.

  