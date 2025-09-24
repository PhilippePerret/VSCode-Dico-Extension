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
    static get container() {
      if (!this._container) {
        this._container = document.querySelector("main#items");
      }
      return this._container;
    }
    static get template() {
      if (!this._template) {
        this._template = document.querySelector("template#item-template");
      }
      return this._template;
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
    /**
     * Construit le cache à partir des données en base de données
     * Méthode commune DRY - pas de duplication !
     */
    static buildCache(bddData) {
      console.log(`[${this.name}] buildCache called with ${bddData.length} items`);
      try {
        this.cacheManager.buildCache(
          bddData,
          (item) => this.prepareItemForCache(item),
          this.minName
        );
        console.log(`[${this.name}] Cache built successfully, size: ${this.cacheSize}`);
      } catch (error) {
        console.error(`[${this.name}] Cache build failed:`, error);
        throw error;
      }
    }
    /**
     * Récupère un élément par son ID
     * @param id - ID de l'élément à récupérer
     */
    static get(id) {
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
     * Accesso pour être compatible avec les tests existants
     * @deprecated
     */
    static get _searchCache() {
      return this.searchCache;
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
      return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
  };

  // src/webviews/CacheManager.ts
  var CacheManager = class {
    _cache = /* @__PURE__ */ new Map();
    _isBuilt = false;
    /**
     * Construit le cache à partir des données brutes
     * @param rawData - Données brutes de la base de données
     * @param prepareFunction - Fonction de préparation des données pour le cache
     * @param debugName - Nom pour les logs de debug
     */
    buildCache(rawData, prepareFunction, debugName) {
      this._cache.clear();
      rawData.forEach((item) => {
        const preparedItem = prepareFunction(item);
        this._cache.set(item.id, preparedItem);
      });
      this._isBuilt = true;
      console.log(`Cache construit pour ${debugName}: ${this._cache.size} \xE9l\xE9ments`);
    }
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
      const result2 = [];
      this._cache.forEach((item, id) => {
        if (predicate(item, id)) {
          result2.push(item);
        }
      });
      return result2;
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
      let categorie;
      if (entry.categorie_id && this.cacheManager.has(entry.categorie_id)) {
        const categorieEntry = this.cacheManager.get(entry.categorie_id);
        categorie = categorieEntry ? categorieEntry.entree : void 0;
      }
      return {
        id: entry.id,
        entree: entry.entree,
        entree_min: entreeNormalized,
        entree_min_ra: entreeRationalized,
        categorie_id: entry.categorie_id,
        categorie,
        genre: entry.genre
      };
    }
    /**
     * Recherche d'entrées par préfixe (optimisée)
     * Méthode spécifique Entry
     */
    static searchByPrefix(prefix) {
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

  // src/webviews/films/Film.ts
  var Film = class extends CommonClassItem {
    static minName = "film";
    // Cache manager spécifique aux films
    static _cacheManagerInstance = new CacheManager();
    static get cacheManager() {
      return this._cacheManagerInstance;
    }
    static ERRORS = {
      "no-items": "Aucun film dans la base, bizarrement\u2026"
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
     * Prépare un film pour le cache de recherche
     * SEULE méthode spécifique - le reste hérite de CommonClassItem !
     */
    static prepareItemForCache(film) {
      const titres = [];
      if (film.titre_affiche) {
        titres.push(film.titre_affiche);
      }
      if (film.titre_original) {
        titres.push(film.titre_original);
      }
      if (film.titre_francais) {
        titres.push(film.titre_francais);
      }
      const titres_min = titres.map((titre) => StringNormalizer.toLower(titre));
      return {
        id: film.id,
        titre_affiche: film.titre_affiche,
        titre_original: film.titre_original,
        titre_francais: film.titre_francais,
        titres,
        titres_min,
        annee: film.annee,
        auteurs: film.auteurs,
        auteurs_min: film.auteurs ? StringNormalizer.toLower(film.auteurs) : void 0
      };
    }
    /**
     * Recherche de films par titre (optimisée)
     * Méthode spécifique Film
     */
    static searchByTitle(searchTerm) {
      const searchLower = StringNormalizer.toLower(searchTerm);
      return this.filter((film) => {
        return film.titres_min.some((titre) => titre.includes(searchLower));
      });
    }
    /**
     * Recherche de films par auteur
     * Méthode spécifique Film
     */
    static searchByAuthor(author) {
      const authorLower = StringNormalizer.toLower(author);
      return this.filter((film) => {
        return film.auteurs_min ? film.auteurs_min.includes(authorLower) : false;
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

  // src/webviews/exemples/Exemple.ts
  var Exemple = class extends CommonClassItem {
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
     * Prépare un exemple pour le cache de recherche
     * SEULE méthode spécifique - le reste hérite de CommonClassItem !
     */
    static prepareItemForCache(exemple) {
      const contentNormalized = StringNormalizer.toLower(exemple.content);
      const contentRationalized = StringNormalizer.rationalize(exemple.content);
      let filmTitre;
      if (exemple.oeuvre_id) {
        try {
          if (Film.isCacheBuilt) {
            const film = Film.get(exemple.oeuvre_id);
            filmTitre = film ? film.titre_affiche : void 0;
          }
        } catch (error) {
          console.warn(`[Exemple] Could not resolve oeuvre ${exemple.oeuvre_id}:`, error);
        }
      }
      let entryEntree;
      if (exemple.entry_id) {
        try {
          if (Entry.isCacheBuilt) {
            const entry = Entry.get(exemple.entry_id);
            entryEntree = entry ? entry.entree : void 0;
          }
        } catch (error) {
          console.warn(`[Exemple] Could not resolve entry ${exemple.entry_id}:`, error);
        }
      }
      return {
        id: exemple.id,
        content: exemple.content,
        content_min: contentNormalized,
        content_min_ra: contentRationalized,
        oeuvre_id: exemple.oeuvre_id,
        oeuvre_titre: filmTitre,
        entry_id: exemple.entry_id,
        entry_entree: entryEntree
      };
    }
    /**
     * Recherche d'exemples par contenu (optimisée)
     * Méthode spécifique Exemple
     */
    static searchByContent(searchTerm) {
      const searchLower = StringNormalizer.toLower(searchTerm);
      const searchRa = StringNormalizer.rationalize(searchTerm);
      return this.filter((exemple) => {
        return exemple.content_min.includes(searchLower) || exemple.content_min_ra.includes(searchRa);
      });
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
     * Post-traitement après affichage : regrouper les exemples par film
     * IMPORTANT: Cette méthode est appelée après l'affichage initial
     */
    static afterDisplayItems() {
      console.log("[EXEMPLES] afterDisplayItems - Grouping examples by film");
      if (!this.container) {
        console.error("[EXEMPLES] No container found for grouping");
        return false;
      }
      const exemples = Array.from(this.container.querySelectorAll("div.exemple"));
      if (exemples.length === 0) {
        console.log("[EXEMPLES] No examples found to group");
        return true;
      }
      const groupsByOeuvre = /* @__PURE__ */ new Map();
      const ungrouped = [];
      exemples.forEach((exempleElement) => {
        const oeuvreId = exempleElement.querySelector(".exemple-oeuvre_id")?.textContent?.trim();
        if (oeuvreId && oeuvreId !== "") {
          if (!groupsByOeuvre.has(oeuvreId)) {
            groupsByOeuvre.set(oeuvreId, []);
          }
          groupsByOeuvre.get(oeuvreId).push(exempleElement);
        } else {
          ungrouped.push(exempleElement);
        }
      });
      console.log(`[EXEMPLES] Found ${groupsByOeuvre.size} oeuvre groups and ${ungrouped.length} ungrouped examples`);
      this.container.innerHTML = "";
      for (const [oeuvreId, oeuvreExemples] of groupsByOeuvre) {
        let oeuvreTitle = oeuvreId;
        if (this.isCacheBuilt) {
          const exempleWithOeuvre = oeuvreExemples[0];
          if (exempleWithOeuvre) {
            const dataId = exempleWithOeuvre.getAttribute("data-id");
            if (dataId) {
              const cachedExemple = this.get(dataId);
              if (cachedExemple?.oeuvre_titre) {
                oeuvreTitle = cachedExemple.oeuvre_titre;
              }
            }
          }
        }
        const oeuvreHeader = document.createElement("h3");
        oeuvreHeader.className = "film-title";
        oeuvreHeader.textContent = oeuvreTitle;
        const btnAdd = document.createElement("button");
        btnAdd.className = "btn-add-exemple";
        btnAdd.innerHTML = '<i class="codicon codicon-add"></i>';
        btnAdd.setAttribute("data-oeuvre-id", oeuvreId);
        oeuvreHeader.appendChild(btnAdd);
        this.container.appendChild(oeuvreHeader);
        oeuvreExemples.forEach((exemple) => {
          this.container.appendChild(exemple);
        });
      }
      if (ungrouped.length > 0) {
        const ungroupedHeader = document.createElement("h3");
        ungroupedHeader.className = "film-title";
        ungroupedHeader.textContent = "Exemples sans film";
        this.container.appendChild(ungroupedHeader);
        ungrouped.forEach((exemple) => {
          this.container.appendChild(exemple);
        });
      }
      console.log("[EXEMPLES] Grouping completed");
      return true;
    }
  };

  // src/webviews/common.ts
  var vscode = acquireVsCodeApi();
  window.addEventListener("message", (event) => {
    const message2 = event.data;
    switch (message2.command) {
      case "queryDOM":
        queryDOMObject(message2);
        break;
      case "queryDOMAll":
        handleQueryDOMAll(message2);
        break;
      case "queryDOMVisible":
        handleQueryDOMVisible(message2);
        break;
      case "typeInElement":
        handleTypeInElement(message2);
        break;
      case "clearAndTypeInElement":
        handleClearAndTypeInElement(message2);
        break;
      case "clearElement":
        handleClearElement(message2);
        break;
      case "getElementFromParent":
        handleGetElementFromParent(message2);
        break;
      case "executeScript":
        handleExecuteScript(message2);
        break;
      case "updateContent":
        const targetElement = document.querySelector(message2.target);
        if (targetElement) {
          targetElement.innerHTML = message2.content;
        }
        break;
      case "load":
        console.log("[CLIENT] Processing load message - panelId:", message2.panelId, "items count:", message2.items?.length);
        renderItems(message2.items, message2.panelId);
        break;
    }
  });
  function queryDOMObject(message2) {
    const element = document.querySelector(message2.selector);
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
      selector: message2.selector,
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
  function handleQueryDOMAll(message2) {
    const elements = document.querySelectorAll(message2.params.selector);
    const elementsData = Array.from(elements).map(createElementData);
    vscode.postMessage({
      command: "queryDOMAllResult",
      params: message2.params,
      result: elementsData
    });
  }
  function handleQueryDOMVisible(message2) {
    const elements = document.querySelectorAll(message2.params.selector);
    const visibleElements = Array.from(elements).filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    });
    const elementsData = visibleElements.map(createElementData);
    vscode.postMessage({
      command: "queryDOMVisibleResult",
      params: message2.params,
      result: elementsData
    });
  }
  function handleTypeInElement(message2) {
    const element = document.querySelector(message2.params.selector);
    if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
      element.value += message2.params.text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    vscode.postMessage({
      command: "typeInElementResult",
      params: message2.params,
      result: null
    });
  }
  function handleClearAndTypeInElement(message2) {
    const element = document.querySelector(message2.params.selector);
    if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
      element.value = message2.params.text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    vscode.postMessage({
      command: "clearAndTypeInElementResult",
      params: message2.params,
      result: null
    });
  }
  function handleClearElement(message2) {
    const element = document.querySelector(message2.params.selector);
    if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
      element.value = "";
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    vscode.postMessage({
      command: "clearElementResult",
      params: message2.params,
      result: null
    });
  }
  function handleGetElementFromParent(message2) {
    const parentElement = document.getElementById(message2.params.parentId);
    let elementData = null;
    if (parentElement) {
      const element = parentElement.querySelector(message2.params.selector);
      if (element) {
        elementData = createElementData(element);
      }
    }
    vscode.postMessage({
      command: "getElementFromParentResult",
      params: message2.params,
      result: elementData
    });
  }
  function handleExecuteScript(message) {
    let result = null;
    try {
      result = eval(message.params.script);
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
  function getClassItem(panelId) {
    switch (panelId) {
      case "entries":
        return Entry;
      case "films":
        return Film;
      case "exemples":
        return Exemple;
      default:
        return null;
    }
  }
  function renderItems(items, panelId) {
    const itemClass = getClassItem(panelId);
    if (!itemClass) {
      console.error(`No item class found for panelId: ${panelId}`);
      return;
    }
    if (!itemClass.container || !itemClass.template) {
      console.error(`Container or template not found for ${panelId}`);
      return;
    }
    if (items.length > 0) {
      console.log(`[CLIENT] Building cache for ${panelId} with ${items.length} items`);
      itemClass.buildCache(items);
    }
    itemClass.container.innerHTML = "";
    if (items.length) {
      renderExistingItems(items, itemClass);
    } else {
      itemClass.container.innerHTML = `<div class="no-${panelId}">${itemClass.error("no-items")}</div>`;
    }
    vscode.postMessage({ command: "panel-ready" });
  }
  function renderExistingItems(items, itemClass) {
    items.forEach((item, index) => {
      const clone = itemClass.template.content.cloneNode(true);
      const mainElement = clone.querySelector("." + itemClass.minName);
      if (mainElement) {
        if (item.id) {
          mainElement.setAttribute("data-id", item.id);
        }
        mainElement.setAttribute("data-index", index.toString());
      }
      Object.keys(item).forEach((prop) => {
        const elements = clone.querySelectorAll(`[data-prop="${prop}"]`);
        elements.forEach((element) => {
          element.textContent = itemClass.formateProp(prop, item[prop]);
        });
      });
      itemClass.container.appendChild(clone);
    });
    itemClass.afterDisplayItems.call(itemClass);
  }
  function hideElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add("hidden");
    }
  }
  function showElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.classList.remove("hidden");
    }
  }
  function toggleElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.classList.toggle("hidden");
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    console.log("Panneau initialis\xE9");
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
  console.log("[CLIENT] common.ts loaded and executed - All event listeners set up");

  // src/webviews/films/main.ts
  window.Film = Film;
  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector("#search-input");
    if (searchInput) {
      let filterFilms2 = function() {
        const searchTerm = searchInput.value.trim();
        const allFilms = document.querySelectorAll("div.film");
        console.log(`[FILM-SEARCH] Filtering with term: "${searchTerm}", total films: ${allFilms.length}`);
        if (!searchTerm) {
          allFilms.forEach((film) => {
            film.style.display = "";
          });
          console.log("[FILM-SEARCH] Empty search term - showing all films");
          return;
        }
        if (Film.isCacheBuilt) {
          console.log("[FILM-SEARCH] Using cache-based search");
          const matchingFilms = Film.searchByTitle(searchTerm);
          console.log(`[FILM-SEARCH] Cache search found ${matchingFilms.length} matches`);
          const matchingIds = new Set(matchingFilms.map((film) => film.id));
          let hiddenCount = 0;
          let shownCount = 0;
          allFilms.forEach((filmElement) => {
            const filmId = filmElement.getAttribute("data-id");
            if (matchingIds.has(filmId)) {
              filmElement.style.display = "";
              shownCount++;
            } else {
              filmElement.style.display = "none";
              hiddenCount++;
            }
          });
          console.log(`[FILM-SEARCH] Result: ${shownCount} shown, ${hiddenCount} hidden`);
        } else {
          console.log("[FILM-SEARCH] Cache not built - using DOM fallback");
          let hiddenCount = 0;
          let shownCount = 0;
          allFilms.forEach((filmElement) => {
            const titleElement = filmElement.querySelector(".film-titre_affiche");
            if (titleElement) {
              const titleText = titleElement.textContent?.toLowerCase() || "";
              if (titleText.includes(searchTerm.toLowerCase())) {
                filmElement.style.display = "";
                shownCount++;
              } else {
                filmElement.style.display = "none";
                hiddenCount++;
              }
            }
          });
          console.log(`[FILM-SEARCH] Fallback result: ${shownCount} shown, ${hiddenCount} hidden`);
        }
      };
      var filterFilms = filterFilms2;
      searchInput.addEventListener("input", filterFilms2);
      searchInput.addEventListener("keyup", filterFilms2);
      console.log("[FILMS] Search functionality initialized");
    }
  });
  console.log("[FILMS] Panel initialized with TypeScript modules");
})();
//# sourceMappingURL=films-bundle.js.map
