"use strict";
(() => {
  // src/webviews/CommonClassItem.ts
  var CommonClassItem = class {
    static _container = null;
    static _template = null;
    // Propriétés qui doivent être définies par les classes filles
    static minName;
    static ERRORS;
    // Cache manager - chaque classe fille doit fournir sa propre instance
    static get cacheManager() {
      throw new Error("cacheManager getter must be implemented by subclass");
    }
    // Pour tester
    static get cacheIsInitied() {
      return this.cacheManager.prepared === true;
    }
    static get container() {
      return this._container || (this._container = document.querySelector("main#items"));
    }
    static get template() {
      return this._template || (this._template = document.querySelector("template#item-template"));
    }
    static error(errorId) {
      const errors = this.ERRORS;
      return errors?.[errorId] || `Unknown error: ${errorId}`;
    }
    /**
     * Formate une propriété pour l'affichage
     * DOIT être surchargée par chaque classe fille
     */
    static formateProp(prop, value) {
      throw new Error("formateProp must be implemented by subclass");
    }
    /**
     * Prépare un item pour le cache de recherche
     * DOIT être surchargée par chaque classe fille
     */
    static prepareItemForCache(item) {
      throw new Error("prepareItemForCache must be implemented by subclass");
    }
    // Doit être écrasé par chaque classe d'élément
    static finalizeCachedItem(item) {
      throw new Error(`finalizeCachedItem doit \xEAtre impl\xE9ment\xE9 par chaque \xE9l\xE9ment`);
    }
    // Doit être écrasé par chaque classe fille (il semble que je doive
    // faire comme ça pour ne pas avoir d'erreur d'absence de méthode)
    static searchMatchingItems(searched) {
      throw new Error(`La m\xE9thode searchMatchingItems doit \xEAtre impl\xE9ment\xE9e par la classe ${this.name}`);
    }
    /**
     * Construit le cache à partir des données en base de données
     * Dans un premier temps, les données sont mises telle quelles
     * Puis, une fois qu'elles seront toutes chargées (pour tous les
     * éléments) on pourra préparer chaque item.
     */
    static buildCache(bddData) {
      try {
        this.cacheManager.prepareCacheWithData(
          bddData,
          (item) => this.prepareItemForCache(item),
          this.minName
        );
      } catch (error) {
        console.error(`[WEBVIEW ${this.name}] Cache build failed:`, error);
        throw error;
      }
    }
    /**
     * Finalise les données mises en cache, maintenant qu'elles ont été
     * chargées pour tous les éléments
     */
    static finalizeCachedData() {
      try {
        this.cacheManager.finalizeCachedData(
          (item) => this.finalizeCachedItem(item),
          this.minName
        );
      } catch (error) {
        console.error(`[WEBVIEW ${this.name}] Finalisation cached data failed:`, error);
      }
      return this;
    }
    /**
     * Peuple le panneau de l'élément avec les données mises en cache
     */
    static populatePanel() {
      const container = this.container;
      container.innerHTML = "";
      const items = this.getAll();
      if (items.length === 0) {
        container.innerHTML = `<div class="no-${this.minName}">${this.error("no-items")}</div>`;
        return this;
      }
      items.forEach((item, index) => {
        const clone = this.template.content.cloneNode(true);
        const mainElement = clone.querySelector("." + this.minName);
        if (mainElement) {
          if (item.id) {
            mainElement.setAttribute("data-id", item.id);
          }
          mainElement.setAttribute("data-index", index.toString());
        }
        Object.keys(item).forEach((prop) => {
          const elements = clone.querySelectorAll(`[data-prop="${prop}"]`);
          elements.forEach((element) => {
            element.textContent = this.formateProp(prop, item[prop]);
          });
        });
        container.appendChild(clone);
      });
      this.afterDisplayItems();
      return this;
    }
    /**
     * Méthode qui observe le panneau, à commencer par la captation des
     * touches et le champ de recherche/filtrage
     * TODO Mettre un picto filtrage devant le champ
     * 
     */
    static observePanel() {
      const searchInput = document.querySelector("#search-input");
      const DomItemsState = {};
      this.forEach((item) => DomItemsState[item.id] = "block");
      const filterEntries = () => {
        const searchTerm = searchInput.value.trim();
        const allItems = this.getAll();
        const allCount = allItems.length;
        console.log(`[SEARCH ENTRY] Filtering with term: "${searchTerm}", total entries: ${allCount}`);
        const matchingItems = this.searchMatchingItems(searchTerm);
        const matchingCount = matchingItems.length;
        console.log("[SEARCH ENTRY] Cache search found %i matches / %i", matchingCount, allCount);
        const matchingIds = new Set(matchingItems.map((item) => item.id));
        allItems.forEach((item) => {
          const display = matchingIds.has(item.id) ? "block" : "none";
          if (DomItemsState[item.id] !== display) {
            const domObj = document.querySelector(`main#items > div.item[data-id="${item.id}"]`);
            domObj.style.display = display;
            DomItemsState[item.id] = display;
          }
        });
        console.log(`[SEARCH ${this.minName}] Result:  %i shown, %i hidden`, matchingCount, allCount - matchingCount);
      };
      searchInput.addEventListener("input", filterEntries);
      searchInput.addEventListener("keyup", filterEntries);
      return this;
    }
    /**
     * Récupère un élément par son ID
     * @param id - ID de l'élément à récupérer
     */
    static get(id) {
      if (this.cacheManager.isBuilt === true) {
        console.info("cache manager des oeuvre", this.cacheManager);
        throw new Error("Pour s'arr\xEAter l\xE0");
      }
      return this.cacheManager.get(id);
    }
    /**
     * Récupère tous les éléments du cache
     */
    static getAll() {
      return this.cacheManager.getAll();
    }
    /**
     * Itère sur tous les éléments du cache
     * @param callback - Fonction appelée pour chaque élément
     */
    static forEach(callback) {
      this.cacheManager.forEach(callback);
    }
    /**
     * Filtre les éléments du cache
     * @param predicate - Fonction de filtrage
     */
    static filter(predicate) {
      return this.cacheManager.filter(predicate);
    }
    /**
     * Efface le cache
     */
    static clearCache() {
      this.cacheManager.clear();
    }
    /**
     * Vérifie si le cache est construit
     */
    static get isCacheBuilt() {
      return this.cacheManager.isBuilt;
    }
    /**
     * Retourne la taille du cache
     */
    static get cacheSize() {
      return this.cacheManager.size;
    }
    /**
     * Récupère le cache (pour compatibilité avec les tests existants)
     * @deprecated Utiliser les nouvelles méthodes get(), getAll(), etc.
     */
    static get searchCache() {
      const manager = this.cacheManager;
      return manager.isBuilt ? manager.getAll() : null;
    }
    /**
     * Post-traitement après affichage des éléments
     * Doit être surclassé par les méthodes propres aux différents panneaux
     */
    static afterDisplayItems() {
      return true;
    }
  };

  // src/webviews/CacheTypes.ts
  var StringNormalizer = class {
    /**
     * Normalise une chaîne en minuscules
     */
    static toLower(text) {
      return text.toLowerCase();
    }
    /**
     * Normalise une chaîne en supprimant les accents et diacritiques
     * TODO: À améliorer avec une vraie fonction de normalisation
     */
    static rationalize(text) {
      return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
    }
  };

  // src/webviews/CacheManager.ts
  var CacheManager = class {
    _cache = /* @__PURE__ */ new Map();
    _isBuilt = false;
    _isPrepared = false;
    get prepared() {
      return this._isPrepared === true;
    }
    prepareCacheWithData(rawData, prepareItemForCacheMethod, debugName) {
      this._cache.clear();
      rawData.forEach((item) => {
        this._cache.set(item.id, prepareItemForCacheMethod(item));
      });
      this._isPrepared = true;
      console.log(`Cache pr\xE9par\xE9 pour ${debugName}: ${this._cache.size} \xE9l\xE9ments`);
    }
    finalizeCachedData(finalizeItemMethod, debugName) {
      this.forEach((item) => finalizeItemMethod(item));
    }
    // /**
    //  * Construit le cache à partir des données brutes
    //  * @param rawData - Données brutes de la base de données
    //  * @param prepareFunction - Fonction de préparation des données pour le cache
    //  * @param debugName - Nom pour les logs de debug
    //  */
    // buildCache(
    //   finalizeCachedItemMethod: (item: TCached) => TCached,
    //   debugName: string
    // ): void {
    //   // On boucle sur les données qui ont été mises en cache.
    //   this._cache.forEach(item => {
    //     this._cache.set(item.id, finalizeCachedItemMethod(item));
    //   });
    //   this._isBuilt = true;
    //   console.log(`Cache construit pour ${debugName} éléments`);
    // }
    /**
     * Récupère un élément par son ID
     * @param id - ID de l'élément à récupérer
     * @returns L'élément trouvé ou null
     */
    get(id) {
      return this._cache.get(id) || null;
    }
    /**
     * Récupère tous les éléments du cache sous forme d'array
     * @returns Array de tous les éléments cachés
     */
    getAll() {
      return Array.from(this._cache.values());
    }
    /**
     * Récupère toutes les clés (IDs) du cache
     * @returns Array de tous les IDs
     */
    getAllIds() {
      return Array.from(this._cache.keys());
    }
    /**
     * Itère sur tous les éléments du cache
     * @param callback - Fonction appelée pour chaque élément
     */
    forEach(callback) {
      this._cache.forEach((item, id) => callback(item, id));
    }
    /**
     * Filtre les éléments du cache
     * @param predicate - Fonction de filtrage
     * @returns Array des éléments qui correspondent au critère
     */
    filter(predicate) {
      const result = [];
      this._cache.forEach((item, id) => {
        if (predicate(item, id)) {
          result.push(item);
        }
      });
      return result;
    }
    /**
     * Cherche un élément selon un critère
     * @param predicate - Fonction de recherche
     * @returns Premier élément trouvé ou null
     */
    find(predicate) {
      for (const [id, item] of this._cache) {
        if (predicate(item, id)) {
          return item;
        }
      }
      return null;
    }
    /**
     * Vide le cache
     */
    clear() {
      this._cache.clear();
      this._isBuilt = false;
    }
    /**
     * Vérifie si le cache est construit
     */
    get isBuilt() {
      return this._isBuilt;
    }
    /**
     * Retourne la taille du cache
     */
    get size() {
      return this._cache.size;
    }
    /**
     * Vérifie si un ID existe dans le cache
     * @param id - ID à vérifier
     */
    has(id) {
      return this._cache.has(id);
    }
  };

  // src/webviews/entries/Entry.ts
  var Entry = class extends CommonClassItem {
    static minName = "entry";
    // Cache manager spécifique aux entrées
    static _cacheManagerInstance = new CacheManager();
    static get cacheManager() {
      return this._cacheManagerInstance;
    }
    static ERRORS = {
      "no-items": "Aucune entr\xE9e dans la base, bizarrement\u2026"
    };
    static GENRES = {
      "nm": "n.m.",
      "nf": "n.f.",
      "np": "n.pl.",
      "vb": "verbe",
      "adj": "adj.",
      "adv": "adv."
    };
    static formateProp(prop, value) {
      switch (prop) {
        case "genre":
          return this.GENRES[value] || `# genre ${value} inconnu #`;
        default:
          return value || "";
      }
    }
    /**
     * Prépare une entrée pour le cache de recherche
     * SEULE méthode spécifique - le reste hérite de CommonClassItem !
     */
    static prepareItemForCache(entry) {
      const entreeNormalized = StringNormalizer.toLower(entry.entree);
      const entreeRationalized = StringNormalizer.rationalize(entry.entree);
      return {
        id: entry.id,
        entree: entry.entree,
        entree_min: entreeNormalized,
        entree_min_ra: entreeRationalized,
        categorie_id: entry.categorie_id,
        categorie: void 0,
        genre: entry.genre
      };
    }
    /**
     * Méthode qui, après chargement de toutes les données, finalise la
     * donnée cache
     * 
     * @param item Entrée du dictionnaire
     */
    static finalizeCachedItem(item) {
      let categorie;
      if (item.categorie_id) {
        const categorieEntry = this.cacheManager.get(item.categorie_id);
        categorie = categorieEntry ? categorieEntry.entree : void 0;
        item.categorie = categorie;
      } else {
        item.categorie = "-- hors cat\xE9gorie --";
      }
    }
    /**
     * Recherche d'entrées par préfixe (optimisée)
     * Méthode spécifique Entry
     */
    static searchMatchingItems(prefix) {
      const prefixLower = StringNormalizer.toLower(prefix);
      const prefixRa = StringNormalizer.rationalize(prefix);
      return this.filter((entry) => {
        return entry.entree_min.startsWith(prefixLower) || entry.entree_min_ra.startsWith(prefixRa);
      });
    }
    // Méthodes typées pour plus de confort (optionnel)
    static get(id) {
      return super.get(id);
    }
    static getAll() {
      return super.getAll();
    }
  };
  window.Entry = Entry;

  // src/webviews/oeuvres/Oeuvre.ts
  var Oeuvre = class extends CommonClassItem {
    static minName = "oeuvre";
    static REG_ARTICLES = /\b(an|a|the|le|la|les|l'|de|du)\b/i;
    // Cache manager spécifique aux oeuvres
    static _cacheManagerInstance = new CacheManager();
    static get cacheManager() {
      return this._cacheManagerInstance;
    }
    // pour test
    static get cacheManagerForced() {
      return this.cacheManager;
    }
    static ERRORS = {
      "no-items": "Aucune \u0153uvre dans la base, bizarrement\u2026"
    };
    static formateProp(prop, value) {
      switch (prop) {
        case "annee":
          return value ? value.toString() : "";
        default:
          return value || "";
      }
    }
    /**
     * Prépare une œuvre pour le cache de recherche
     * SEULE méthode spécifique - le reste hérite de CommonClassItem !
     */
    static prepareItemForCache(oeuvre) {
      const titres = [];
      if (oeuvre.titre_francais) {
        titres.push(StringNormalizer.rationalize(oeuvre.titre_francais));
      }
      if (oeuvre.titre_original) {
        titres.push(StringNormalizer.rationalize(oeuvre.titre_original));
      }
      if (oeuvre.titre_affiche) {
        titres.push(StringNormalizer.rationalize(oeuvre.titre_affiche));
      }
      titres.forEach((titre) => {
        if (titre.match(this.REG_ARTICLES)) {
          titres.push(titre.replace(this.REG_ARTICLES, ""));
        }
      });
      const uniqTitres = [];
      titres.forEach((titre) => {
        if (uniqTitres.includes(titre)) {
          return;
        }
        uniqTitres.push(titre);
      });
      const titresLookUp = uniqTitres.map((titre) => StringNormalizer.toLower(titre));
      return {
        id: oeuvre.id,
        titre_affiche: oeuvre.titre_affiche,
        titre_original: oeuvre.titre_original,
        titre_francais: oeuvre.titre_francais,
        titres,
        titresLookUp,
        annee: oeuvre.annee,
        auteurs: oeuvre.auteurs
      };
    }
    /**
     * Recherche d'œuvres par titre (optimisée)
     * Méthode spécifique Oeuvre
     */
    static searchMatchingItems(searchTerm) {
      const searchLower = StringNormalizer.toLower(searchTerm);
      return this.filter((oeuvre) => {
        return oeuvre.titresLookUp.some((titre) => {
          const res = titre.startsWith(searchLower);
          console.log("Le titre %s r\xE9pond %s avec %s", oeuvre.titre_affiche, res, searchLower);
          return res;
        });
      });
    }
  };
  window.Oeuvre = Oeuvre;

  // src/webviews/common.ts
  function ItemClass(panelId) {
    switch (panelId) {
      case "entries":
        return Entry;
      case "oeuvres":
        return Oeuvre;
      case "exemples":
        return Exemple;
    }
  }
  var vscode = acquireVsCodeApi();
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
      case "queryDOM":
        queryDOMObject(message);
        break;
      case "queryDOMAll":
        handleQueryDOMAll(message);
        break;
      case "queryDOMVisible":
        handleQueryDOMVisible(message);
        break;
      case "typeInElement":
        handleTypeInElement(message);
        break;
      case "clearAndTypeInElement":
        handleClearAndTypeInElement(message);
        break;
      case "clearElement":
        handleClearElement(message);
        break;
      case "getElementFromParent":
        handleGetElementFromParent(message);
        break;
      case "executeScript":
        handleExecuteScript(message);
        break;
      case "updateContent":
        const targetElement = document.querySelector(message.target);
        if (targetElement) {
          targetElement.innerHTML = message.content;
        }
        break;
      case "cacheData":
        cacheAllData(message.items, message.panelId);
        break;
      case "populate":
        console.log(`[WEBVIEW] Demande population du panneau ${message.panelId} re\xE7ue.`);
        populatePanel(message.panelId);
        break;
    }
  });
  function cacheAllData(items, panelId) {
    ItemClass(panelId).buildCache(items);
    vscode.postMessage({ command: "cache-ready" });
  }
  function populatePanel(panelId) {
    ItemClass(panelId).finalizeCachedData().populatePanel().observePanel();
    vscode.postMessage({ command: "panel-ready" });
  }
  function queryDOMObject(message) {
    const element = document.querySelector(message.selector);
    let elementData = null;
    if (element) {
      elementData = {
        tagName: element.tagName.toLowerCase(),
        textContent: element.textContent || "",
        classList: Array.from(element.classList),
        id: element.id,
        exists: true
      };
    }
    vscode.postMessage({
      command: "domQueryResult",
      selector: message.selector,
      element: elementData
    });
  }
  function createElementData(element) {
    return {
      tagName: element.tagName.toLowerCase(),
      textContent: element.textContent || "",
      classList: Array.from(element.classList),
      id: element.id,
      exists: true
    };
  }
  function handleQueryDOMAll(message) {
    const elements = document.querySelectorAll(message.params.selector);
    const elementsData = Array.from(elements).map(createElementData);
    vscode.postMessage({
      command: "queryDOMAllResult",
      params: message.params,
      result: elementsData
    });
  }
  function handleQueryDOMVisible(message) {
    const elements = document.querySelectorAll(message.params.selector);
    const visibleElements = Array.from(elements).filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    });
    const elementsData = visibleElements.map(createElementData);
    vscode.postMessage({
      command: "queryDOMVisibleResult",
      params: message.params,
      result: elementsData
    });
  }
  function handleTypeInElement(message) {
    const element = document.querySelector(message.params.selector);
    if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
      element.value += message.params.text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    vscode.postMessage({
      command: "typeInElementResult",
      params: message.params,
      result: null
    });
  }
  function handleClearAndTypeInElement(message) {
    const element = document.querySelector(message.params.selector);
    if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
      element.value = message.params.text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    vscode.postMessage({
      command: "clearAndTypeInElementResult",
      params: message.params,
      result: null
    });
  }
  function handleClearElement(message) {
    const element = document.querySelector(message.params.selector);
    if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
      element.value = "";
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    vscode.postMessage({
      command: "clearElementResult",
      params: message.params,
      result: null
    });
  }
  function handleGetElementFromParent(message) {
    const parentElement = document.getElementById(message.params.parentId);
    let elementData = null;
    if (parentElement) {
      const element = parentElement.querySelector(message.params.selector);
      if (element) {
        elementData = createElementData(element);
      }
    }
    vscode.postMessage({
      command: "getElementFromParentResult",
      params: message.params,
      result: elementData
    });
  }
  function handleExecuteScript(message) {
    let result = null;
    try {
      result = (0, eval)(message.params.script);
    } catch (error) {
      console.error("Script execution error:", error);
      result = error.message;
    }
    vscode.postMessage({
      command: "executeScriptResult",
      params: message.params,
      result
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("keydown", (event) => {
    });
    const consoleInput = document.querySelector("#panel-console");
    if (consoleInput) {
      consoleInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          const command = consoleInput.value.trim();
          if (command) {
            vscode.postMessage({
              command: "console-command",
              value: command
            });
            consoleInput.value = "";
          }
        }
      });
    }
  });

  // src/webviews/exemples/Exemple.ts
  var Exemple = class _Exemple extends CommonClassItem {
    static minName = "exemple";
    // Cache manager spécifique aux exemples
    static _cacheManagerInstance = new CacheManager();
    static get cacheManager() {
      return this._cacheManagerInstance;
    }
    static ERRORS = {
      "no-items": "Aucun exemple dans la base, bizarrement\u2026"
    };
    static formateProp(prop, value) {
      return value || "";
    }
    /**
     * Finalise la donnée pour le cache
     */
    static finalizeCachedItem(exemple) {
      let oeuvreTitle;
      if (exemple.oeuvre_id) {
        try {
          if (Oeuvre.isCacheBuilt) {
            const oeuvre = Oeuvre.get(exemple.oeuvre_id);
            oeuvreTitle = oeuvre ? oeuvre.titre_affiche : void 0;
          }
        } catch (error) {
          console.warn(`[Exemple] Could not resolve oeuvre ${exemple.oeuvre_id}:`, error);
        }
      }
      exemple.oeuvre_titre = oeuvreTitle;
      let entryEntree;
      try {
        if (Entry.isCacheBuilt) {
          const entry = Entry.get(exemple.entry_id);
          entryEntree = entry ? entry.entree : void 0;
        }
      } catch (error) {
        console.warn(`[Exemple] Could not resolve entry ${exemple.entry_id}:`, error);
      }
      exemple.entry_entree = entryEntree;
      return exemple;
    }
    /**
     * Prépare un exemple pour le cache de recherche
     * SEULE méthode spécifique - le reste hérite de CommonClassItem !
     * 
     * TODO En fait, il faut une méthode en deux temps :
     *  - le premier ne fait que mettre les données de l'item dans
     *    la donnée cachée
     *  - le deuxième temps, une fois toutes les données de tous les
     *    types chargées, prépare les données spéciales qui ont besoin
     *    des autres types.
     */
    static prepareItemForCache(exemple) {
      const contentNormalized = StringNormalizer.toLower(exemple.content);
      const contentRationalized = StringNormalizer.rationalize(exemple.content);
      return {
        id: exemple.id,
        content: exemple.content,
        content_min: contentNormalized,
        content_min_ra: contentRationalized,
        oeuvre_id: exemple.oeuvre_id,
        oeuvre_titre: void 0,
        entry_id: exemple.entry_id,
        entry_entree: void 0
      };
    }
    /**
     * Filtrage des exemples 
     * Méthode spécifique Exemple
     * 
     * En mode "normal"
     * Le filtrage, sauf indication contraire, se fait par rapport aux
     * titres de film. Le mécanisme est le suivant : l'user tape un
     * début de titres de film. On en déduit les titres grâce à la
     * méthode de la classe Oeuvre. On prend l'identifiant et on 
     * affiche tous les exemples du film voulu.
     * 
     * En mode "Entrée", l'utilisateur tape une entrée du dictionnaire
     * et la méthode renvoie tous les exemples concernant cette entrée.
     * 
     * En mode "Contenu", la recherche se fait sur le contenu, partout
     * et sur toutes les entrées.
     * 
     * QUESTION Comment faire la différence entre les différents modes
     * de recherche ? peut-être avec un préfix ('content' pour recher-
     * che sur le contenu, 'dico:' ou 'entree:' pour la recherche sur 
     * les entrées et rien pour la recherche sur le film)
     */
    static searchMatchingItems(searched) {
      const searchLower = StringNormalizer.toLower(searched);
      const searchRa = StringNormalizer.rationalize(searched);
      const mode = "by oeuvre";
      switch (mode) {
        case "by oeuvre":
          const oeuvreId = "DITD";
          return this.getByOeuvre(oeuvreId);
        case "by entry":
          return [];
        case "by content":
          return this.filter((exemple) => {
            return exemple.content_min.includes(searchLower) || exemple.content_min_ra.includes(searchRa);
          });
        default:
          return [];
      }
    }
    /**
     * Récupère tous les exemples associés à une oeuvre
     * Méthode spécifique Exemple
     */
    static getByOeuvre(oeuvreId) {
      return this.filter((exemple) => exemple.oeuvre_id === oeuvreId);
    }
    /**
     * Récupère tous les exemples associés à une entrée
     * Méthode spécifique Exemple
     */
    static getByEntry(entryId) {
      return this.filter((exemple) => exemple.entry_id === entryId);
    }
    // Méthodes typées pour plus de confort (optionnel)
    static get(id) {
      return super.get(id);
    }
    static getAll() {
      return super.getAll();
    }
    /**
     * Post-traitement après affichage : ajouter les titres des films
     * IMPORTANT: Cette méthode est appelée après l'affichage initial
     * 
     * Fonctionnement
     * --------------
     * Pour optimiser le traitement, en considérant qu'on peut avoir
     * des milliers d'exemples, on ne passe pas par le DOM mais par
     * les données (getAll). Puisqu'elles sont relevées dans l'ordre,
     * c'est-à-dire par film, il suffit d'ajouter un titre au premier
     * exemple qu'on trouve qui a un film différent du précédent.
     * 
     */
    static afterDisplayItems() {
      console.log("[EXEMPLES] afterDisplayItems - Grouping examples by oeuvre");
      const mainConteneur = this.container;
      if (mainConteneur === null) {
        console.error("[EXEMPLES] No container found for grouping");
        return false;
      }
      let currentOeuvreId = "";
      _Exemple.getAll().forEach((exemple) => {
        if (exemple.oeuvre_id === currentOeuvreId) {
          return;
        }
        const domObj = document.querySelector(`main#items > div.item[data-id="${exemple.id}"]`);
        currentOeuvreId = exemple.oeuvre_id;
        const titleObj = document.createElement("h2");
        const oeuvre = Oeuvre.get(currentOeuvreId);
        if (!oeuvre) {
          console.log("Oeuvre introuvable, Oeuvre.cacheManager vaut", Oeuvre.cacheManagerForced);
          throw new Error("L'\u0153uvre devrait \xEAtre d\xE9finie.");
        }
        console.log("oeuvre r\xE9pondant \xE0 l'id %s", currentOeuvreId, oeuvre);
        const titre = oeuvre ? oeuvre.titre_affiche : "\u0153uvre introuvable";
        console.log("Titre", titre);
        titleObj.innerHTML = titre;
        const btnAdd = document.createElement("button");
        btnAdd.className = "btn-add";
        btnAdd.innerHTML = '<i class="codicon codicon-add"></i>';
        btnAdd.setAttribute("data-oeuvre_id", currentOeuvreId);
        titleObj.appendChild(btnAdd);
        domObj.parentNode?.insertBefore(titleObj, domObj);
      });
      console.log("[EXEMPLES] Titling completed");
      return true;
    }
  };
  window.Exemple = Exemple;
})();
//# sourceMappingURL=exemples-bundle.js.map
