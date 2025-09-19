"use strict";
(() => {
  // src/bothside/StringUtils.ts
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

  // src/webviews/services/SelectionManager.ts
  var SelectionManager = class {
    constructor(klass) {
      this.klass = klass;
    }
    _currentSelection;
    select(item) {
      this._currentSelection && this.deselect(this._currentSelection);
      item.obj.classList.add("selected");
      this._currentSelection = item;
    }
    deselect(item) {
      item.obj.classList.remove("selected");
    }
  };

  // src/webviews/ClientItem.ts
  var ClientItem = class {
    constructor(item) {
      this.item = item;
    }
    static klass;
    static get accessTable() {
      return this.klass._accessTable;
    }
    static panel;
    // protected static _accessTable: AccessTable<any>;
    static _selector;
    static get Selector() {
      return this._selector || (this._selector = new SelectionManager(this.klass));
    }
    // Raccourcis vers l'accessTable, pour obtenir des informations
    // sur les items ou les items eux-même
    static get(itemId) {
      return this.accessTable.get(itemId);
    }
    static getObj(itemId) {
      return this.accessTable.getObj(itemId);
    }
    static each(method) {
      this.accessTable.each(method);
    }
    static isVisible(id) {
      return this.accessTable.isVisible(id);
    }
    static setVisible(id) {
      this.accessTable.setVisibility(id, true);
    }
    static setInvisible(id) {
      this.accessTable.setVisibility(id, false);
    }
    static selectFirstItem() {
      this.panel.select(this.accessTable.firstItem);
    }
    static editItem(itemId) {
      this.panel.form.editItem(this.get(itemId));
    }
    static createNewItem() {
      const emptyDbData = { id: "" };
      this.panel.form.editItem(new this.klass(emptyDbData));
    }
    // toRow(){ return {};}
    /**
     * Méthode qui reçoit les items sérialisés depuis l'extension et va les
     * consigner dans le panneau, dans une AccessTable qui permettra de 
     * parcourrir les éléments. 
     */
    static deserializeItems(items) {
      const allItems = items.map((item) => JSON.parse(item));
      this.setAccessTableWithItems(allItems);
    }
    /* Surclassée */
    static setAccessTableWithItems(items) {
    }
    get id() {
      return this.item.id;
    }
    // Pour obtenir l'AccKey (ak) de l'item
    static getAccKey(id) {
      return this.accessTable.getAccKey(id);
    }
  };

  // src/bothside/RpcChannel.ts
  var RpcChannel = class {
    constructor(sender, receiver) {
      this.sender = sender;
      this.receiver = receiver;
      this.receiver(this.handleMessage.bind(this));
    }
    counter = 0;
    pending = /* @__PURE__ */ new Map();
    handlers = /* @__PURE__ */ new Map();
    handleMessage(msg) {
      if ("id" in msg && "method" in msg) {
        const handler = this.handlers.get(msg.method);
        if (handler) {
          Promise.resolve(handler(msg.params)).then((result) => {
            this.sender({ id: msg.id, result });
          });
        }
      } else if ("id" in msg && "result" in msg) {
        const cb = this.pending.get(msg.id);
        if (cb) {
          cb(msg.result);
          this.pending.delete(msg.id);
        }
      } else if ("method" in msg) {
        const handler = this.handlers.get(msg.method);
        if (handler) {
          handler(msg.params);
        }
      }
    }
    ask(method, params) {
      const id = this.counter++;
      const req = { id, method, params };
      this.sender(req);
      return new Promise((resolve) => {
        this.pending.set(id, resolve);
      });
    }
    notify(method, params) {
      const notif = { method, params };
      this.sender(notif);
    }
    on(method, handler) {
      this.handlers.set(method, handler);
    }
  };

  // src/webviews/RpcClient.ts
  function createRpcClient() {
    const vscode = acquireVsCodeApi();
    return new RpcChannel(
      // sender : envoie vers l'extension
      (msg) => vscode.postMessage(msg),
      // receiver : reçoit les messages de l'extension
      (cb) => window.addEventListener("message", (event) => cb(event.data))
    );
  }

  // src/webviews/services/DomUtils.ts
  var stopEvent = function(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    return false;
  };

  // src/webviews/services/VimLikeManager.ts
  var VimLikeManager = class {
    constructor(root, panel, klass) {
      this.root = root;
      this.panel = panel;
      this.klass = klass;
      this.mode = "null";
      this.form = this.panel.form;
      this.root.addEventListener("keydown", this.universelKeyboardCapture.bind(this), true);
      this.root.addEventListener("keydown", this.onKeyDown.bind(this));
      this._keylistener = this.onKeyDownModeNull.bind(this);
      this.searchInput = this.root.querySelector("input#search-input");
      this.consoleInput = this.root.querySelector("input#panel-console");
      this.searchInput.addEventListener("focus", this.onFocusEditField.bind(this, this.searchInput));
      this.searchInput.addEventListener("blur", this.onBlurEditField.bind(this, this.searchInput));
      this.consoleInput.addEventListener("focus", this.onFocusEditField.bind(this, this.consoleInput));
      this.consoleInput.addEventListener("blur", this.onBlurEditField.bind(this, this.consoleInput));
    }
    // 
    /**
     * MODE DU PANNEAU
     * 
     * Pour le moment, le panneau peut être dans deux états, en
     * fonction du fait que le curseur se trouve dans un champ
     * éditable ou non.
     */
    _keylistener;
    _mode = "normal";
    get mode() {
      return this._mode;
    }
    form;
    setMode(mode) {
      this.mode = mode;
    }
    set mode(mode) {
      this._mode = mode;
      switch (mode) {
        case "edit":
          this._keylistener = this.onKeyDownModeEdit.bind(this);
          break;
        case "normal":
          this._keylistener = this.onKeyDownModeNormal.bind(this);
          break;
        case "null":
          console.log("Le panneau est en mode NULL (sans action");
          this._keylistener = this.onKeyDownModeNull.bind(this);
          break;
        case "form":
          console.log("Panneau en mode FORMulaire");
          this._keylistener = this.onKeyDownModeForm.bind(this);
          break;
      }
      this.root.dataset.mode = `mode-${mode}`;
      if (this.root.querySelector("span#mode-name")) {
        const spanName = this.root.querySelector("span#mode-name");
        spanName.innerHTML = mode.toLocaleUpperCase();
      } else {
        console.warn("Bizarrement, le span #mode-name affichant le mode du panneau est introuvable.");
      }
    }
    searchInput;
    consoleInput;
    onFocusEditField(field, ev) {
      this.setMode("edit");
    }
    onBlurEditField(field, ev) {
      this.setMode("normal");
    }
    keyboardBypass;
    // La méthode qui choppe normalement toutes les touches, quel que soit le mode
    /**
       * Capteur Universel de Touche clavier
       * 
       * Quel que soit le mode, cette méthode reçoit les touches clavier
       * avant tout le monde.
    
       * Cela permet : 
       *    - d'implémenter un système de "coupe-circuit" qui est
       *      utilisé par exemple pour les messages de type "action 
       *      demandée". (voir le manuel pour le détail). 
       *    - d'implémenter la gestion de touche "?" qui permet, quelle
       *      que soit la situation, d'obtenir de l'aide.
       */
    universelKeyboardCapture(ev) {
      if (ev.key === "?") {
        this.panel.activateContextualHelp();
        return stopEvent(ev);
      } else if (ev.target.tagName.toLowerCase() === "select") {
        console.log("Sur select", ev.key);
        const select = ev.target;
        switch (ev.key) {
          case "j":
          case "ArrowDown":
            select.selectedIndex += 1;
            break;
          case "k":
          case "ArrowUp":
            select.selectedIndex -= 1;
            break;
        }
        return true;
      } else if (this.keyboardBypass) {
        if (this.keyboardBypass.has(ev.key)) {
          const methodBypass = this.keyboardBypass.get(ev.key);
          delete this.keyboardBypass;
          this.panel.cleanFlash();
          this.panel.cleanFooterShortcuts();
          methodBypass();
        }
        return ev && stopEvent(ev);
      }
      return true;
    }
    /**
     * API
     * Méthode de discrimination dans l'objet +obj+. Tous les champs qu'il contient
     * qui sont des champs d'édition textuels vont faire basculer dans le mode :editMode
     * quand ils sont focusser et le mode :normalMode (souvent 'normal') quand on va
     * les blurer 
     * 
     * @param obj {HTMLElement} Bloc contenant les champs d'édition
     * @param modes {Hash} Table définisssant :edit et :normal pour savoir le nom des
     * modes à utiliser en édition (dans un champ éditable) et hors édition.
     */
    discrimineFieldsForModeIn(obj, modes) {
      const selectors = 'input[type="text"], input[type="email"], input[type="password"], textarea, [contenteditable]';
      obj.querySelectorAll(selectors).forEach((field) => {
        console.log("Discrimination du champ ", field);
        field.addEventListener("focus", this.setMode.bind(this, modes.edit));
        field.addEventListener("blur", this.setMode.bind(this, modes.normal));
      });
    }
    // Sera remplacé par la bonne méthode suivant le mode.
    onKeyDown(ev) {
      return this._keylistener(ev);
    }
    /**
     * ============ TOUS LES MODES DE CLAVIER ================
     */
    // Quand la touche meta est pressée, on passe toujours par là
    onKeyDownWithMeta(ev) {
      switch (ev.key) {
        case "q":
        case "Q":
          stopEvent(ev);
          console.log("On ne peut pas quitter comme \xE7a\u2026");
          break;
        case "s":
        case "S":
          stopEvent(ev);
          console.log("Demande de sauvegarde forc\xE9e.");
          break;
      }
    }
    onKeyDownModeNormal(ev) {
      if (ev.metaKey) {
        return this.onKeyDownWithMeta(ev);
      }
      stopEvent(ev);
      switch (ev.key) {
        case "j":
          this.klass.accessTable.selectNextItem(this.panel);
          break;
        case "k":
          this.klass.accessTable.selectPrevItem(this.panel);
          break;
        case "s":
          this.searchInput.focus();
          break;
        case "c":
          this.consoleInput.focus();
          break;
        case "e":
          if (this.panel.getSelection()) {
            this.klass.editItem(this.panel.getSelection());
          } else {
            console.log("Pas de s\xE9lection \xE0 \xE9diter");
          }
          break;
        case "n":
          this.klass.createNewItem();
          break;
        default:
          console.log("Pour le moment, je ne fais rien de '%s'", ev.key);
      }
      return false;
    }
    /**
     * Gestionnaire des touches de clavier en mode EDIT (dans un
     * champ d'édition) 
     */
    onKeyDownModeEdit(ev) {
      if (ev.metaKey) {
        return this.onKeyDownWithMeta(ev);
      }
      switch (ev.key) {
        case "Tab":
          ev.target.blur();
          return stopEvent(ev);
      }
      return true;
    }
    // Mode clavier pour le formulaire
    onKeyDownModeForm(ev) {
      console.log("-> onKeyDownModeForm");
      if (this.form.saving === true) {
        return;
      }
      if (ev.metaKey) {
        return this.onKeyDownWithMeta(ev);
      }
      switch (ev.key) {
        case "a":
          this.form.focusField(1);
          break;
        case "b":
          this.form.focusField(2);
          break;
        case "c":
          this.form.focusField(3);
          break;
        case "d":
          this.form.focusField(4);
          break;
        case "e":
          this.form.focusField(5);
          break;
        case "f":
          this.form.focusField(6);
          break;
        case "g":
          this.form.focusField(7);
          break;
        case "l":
          this.form.toggleIdLock();
          break;
        case "s":
          this.form.saveItem(false);
          break;
        case "w":
          this.form.saveItem(true);
          break;
        case "q":
          this.form.cancelEdit();
          break;
        default:
          if (this.form.tableKeys[ev.key]) {
            this.form.tableKeys[ev.key].call(null);
          }
      }
      return stopEvent(ev);
    }
    onKeyDownModeNull(ev) {
      console.error("Il faut activer un mode de clavier");
      return stopEvent(ev);
    }
    // @return true si la cible de l'évènement +ev+ est un champ éditable
    targetEventIsEditable(ev) {
      return ev.target.matches("input, textarea, [contenteditable]");
    }
  };

  // src/webviews/services/AccessTable.ts
  var AccessTable = class {
    // Table des pointeurs de données
    keysMap = /* @__PURE__ */ new Map();
    // Table de toutes les données des items, dans un ordre
    // d'arrivée jamais changé.
    arrayItems = [];
    // Table de la table (pour vérification)
    _size;
    // Le premier item, qui doit forcément être le premier chargé
    _firstItem;
    get firstItem() {
      return this._firstItem || (this._firstItem = this.arrayItems[0]);
    }
    constructor(items) {
      this.populateInTable(items);
    }
    // après un ajout ou une suppression, par exemple
    reset() {
      this._size = null;
    }
    get size() {
      return this._size || (this._size = this.keysMap.size);
    }
    isVisible(id) {
      return this.getAccKey(id).visible === true;
    }
    setVisibility(id, state) {
      const ak = this.getAccKey(id);
      if (ak.visible !== state) {
        ak.visible = state;
        if (ak.obj === void 0) {
          ak.obj = this.DOMElementOf(id);
        }
        const display = state ? "block" : "none";
        ak.display = display;
        ak.obj.style.display = display;
      }
    }
    selectNextItem(panel) {
      const selection = panel.getSelection();
      let nextId;
      if (selection) {
        let nextItemVisible;
        nextItemVisible = this.getNextVisible(selection);
        if (nextItemVisible) {
          nextId = nextItemVisible.id;
        }
      }
      const finalNextId = nextId || this.firstItem.id;
      panel.select(finalNextId);
    }
    selectPrevItem(panel) {
      const selection = panel.getSelection();
      let prevId;
      if (selection) {
        let prevItemVisible;
        prevItemVisible = this.getPrevVisible(selection);
        if (prevItemVisible) {
          prevId = prevItemVisible.id;
        }
      }
      const finalPrevId = prevId || this.firstItem.id;
      panel.select(finalPrevId);
    }
    getNextVisible(refId) {
      let ak;
      let nextAk;
      while (ak = this.getNextAccKey(refId)) {
        if (ak.visible) {
          return this.get(ak.id);
        }
      }
    }
    getPrevVisible(refId) {
      let ak;
      let prevAk;
      while (ak = this.getPrevAccKey(refId)) {
        if (ak.visible) {
          return this.get(ak.id);
        }
      }
    }
    setSelectState(id, state) {
      this.getAccKey(id).selected = state;
    }
    // @return true si l'élément d'identifiant +id+ existe.
    exists(id) {
      return this.keysMap.has(id);
    }
    get(id) {
      return this.arrayItems[this.keysMap.get(id).index];
    }
    getByAccKey(ak) {
      return this.get(ak.id);
    }
    /**
     * Retourne l'objet DOM de l'item en s'assurant qu'il est défini
     * dans l'AccKey (ce qui n'est pas fait par défaut)
     */
    getObj(id) {
      const ak = this.getAccKey(id);
      if (!ak) {
        console.error("Impossible d'obtenir l'AK de l'id '%s'\u2026", id, this.arrayItems);
      }
      ak.obj || Object.assign(ak, { obj: this.DOMElementOf(id) });
      if (!ak.obj) {
        console.error("Impossible d'obtenir l'objet de l'item '%'\u2026", id);
      }
      return ak.obj;
    }
    getAccKey(itemId) {
      return this.keysMap.get(itemId);
    }
    /**
     * Actualise ou Crée le nouvel item Item après son enregistrement.
     * 
     * Pour savoir si c'est une création ou une actualisation, il
     * suffit de voir si l'identifiant est connu de la table (noter
     * que pour les exemples, il n'y a pas d'identifiant autre que
     * volatile).
     * 
     * Noter que ce sont toujours les données compolètes qui sont
     * remontées, même pour une actualisation. Car l'actualisation
     * a pu modifier des données qui servent pour le tri, le formatage,
     * etc.
     * 
     */
    upsert(item) {
      console.log("Item re\xE7u par upsert", item);
      const checkedId = ((ity, item2) => {
        switch (ity) {
          case "entry":
          case "oeuvre":
            return item2.id;
          // Now at root level
          case "exemple":
            return item2.id;
        }
      })(item.cachedData.itemType, item);
      let cachedItem;
      if (this.exists(checkedId)) {
        console.log("C'est une actualisation de l'item ", checkedId);
        cachedItem = this.get(checkedId);
        console.log("Actualisation de", this.get(checkedId));
        Object.assign(cachedItem, item);
      } else {
        console.log("C'est une cr\xE9ation de l'item", item);
        this.createNewAccedableItem(item);
      }
      return true;
    }
    createNewAccedableItem(item) {
      let cachedItem = item;
      this.addInTable(cachedItem, 0, void 0, void 0);
    }
    getNextItem(id) {
      const nextAK = this.getNextAccKey(id);
      return nextAK ? this.get(nextAK.id) : void 0;
    }
    getNextItemByAccKey(ak) {
      return ak.next ? this.get(ak.next) : void 0;
    }
    getPrevItem(id) {
      const prevAK = this.getPrevAccKey(id);
      return prevAK ? this.get(prevAK.id) : void 0;
    }
    getPrevItemByAccKey(ak) {
      return ak.prev ? this.get(ak.prev) : void 0;
    }
    getNextAccKey(id) {
      const ak = this.getAccKey(id);
      return ak.next ? this.getAccKey(ak.next) : void 0;
    }
    getNextAccKeyByAccKey(ak) {
      return ak.next ? this.getNextAccKey(ak.next) : void 0;
    }
    getPrevAccKey(id) {
      const ak = this.getAccKey(id);
      return ak.prev ? this.getAccKey(ak.prev) : void 0;
    }
    getPrevAccKeyByAccKey(ak) {
      return ak.prev ? this.getPrevAccKey(ak.prev) : void 0;
    }
    // Boucle sur tous les éléments (sans retour)
    each(traverseMethod) {
      this.eachSince(traverseMethod, this.firstItem.id);
    }
    // Boucle depuis l'élément d'identifiant +id+
    eachSince(traverseMethod, id) {
      let item = this.get(id);
      do {
        if (item) {
          traverseMethod(item);
          item = this.getNextItem(item.id);
        } else {
          break;
        }
      } while (item);
    }
    /**
     * Boucle sur toutes les AcceedableItem (AccKey/ak)
     */
    eachAccKey(fnEach) {
      this.keysMap.forEach(fnEach);
    }
    /**
     * Boucle sur tous les items à partir de l'item d'id +id+ en
     * collectant une donnée quelconque.
     */
    mapSince(traverseMethod, id) {
      const collected = [];
      let item = this.get(id);
      do {
        if (item) {
          let retour = traverseMethod(item);
          collected.push(retour);
          item = this.getNextItem(item.id);
        } else {
          break;
        }
      } while (item);
      return collected;
    }
    // Boucle sur TOUTES les données en collectant une donnée
    map(traverseMethod) {
      return this.mapSince(traverseMethod, this.firstItem.id);
    }
    /**
     * Méthode qui boucle sur tous les éléments depuis l'élément d'id
     * +itemId+ et retourne une Map avec en clé l'identifiant de
     * l'item et en valeur la valeur retournée par la méthode
     * +traverseMethod+
     */
    collectSince(traverseMethod, itemId) {
      const collected = /* @__PURE__ */ new Map();
      let item = this.get(itemId);
      do {
        if (item) {
          let retour = traverseMethod(item);
          collected.set(item.id, retour);
          item = this.getNextItem(item.id);
        } else {
          break;
        }
      } while (item);
      return collected;
    }
    // Boucle sur tous les éléments en récoltant une valeur qu'on met
    // dans une Map qui a en clé l'identifiant de l'item
    collect(traverseMethod) {
      return this.collectSince(traverseMethod, this.firstItem.id);
    }
    /**
     * Boucle sur les items, depuis l'item d'identifiant +id+ ou depuis le premier et 
     * retourne le premier qui répond à la condition +condition+
     */
    find(condition) {
      return this.findAfter(condition, void 0);
    }
    findAfter(condition, id) {
      let item;
      if (id === void 0) {
        item = this.firstItem;
      } else {
        item = this.getNextItem(id);
      }
      let found;
      do {
        if (item) {
          if (condition(item) === true) {
            found = item;
            break;
          }
          item = this.getNextItem(item.id);
        }
      } while (item);
      return found;
    }
    /**
     * Recherche dans l'ordre tous les éléments répondant à la condition +condition+
     * 
     * @param condition Methode qui doit retourner true pour que l'item soit retenu
     * @param options   Table d'options {count: nombre attendu} 
     * @returns 
     */
    findAll(condition, options) {
      return this.findAllAfter(condition, void 0, options);
    }
    // Idem que précédente mais permet de spécifier le premier élément
    findAllAfter(condition, id, options) {
      const collected = [];
      let collected_count = 0;
      let item;
      if (id === void 0) {
        item = this.firstItem;
      } else {
        item = this.getNextItem(id);
      }
      do {
        if (item) {
          if (condition(item) === true) {
            collected.push(item);
            collected_count++;
            if (options.count && collected_count === options.count) {
              break;
            }
          }
          item = this.getNextItem(item.id);
        }
      } while (item);
      return collected;
    }
    /**
     * Peuplement de la table d'accès avec création des 'chainedItem'
     * 
     * @param items Les éléments transmis, tels que relevés dans les tables (Entry, Oeuvre, Exemple);
     */
    // Méthode qui "initie" la table d'accès en transformant chaque
    // item (Entry, Oeuvre, Exemple) en un AccedableItem, en prenant
    // son index et son index suivant pour les mettres dans la Map
    // qui consignes les valeurs d'accès
    populateInTable(items) {
      this.keysMap = /* @__PURE__ */ new Map();
      this.arrayItems = [];
      for (let i = 0, len = items.length; i < len; ++i) {
        const item = items[i];
        const nextItem = items[i + 1] || void 0;
        const prevItem = items[i - 1] || void 0;
        this.addInTable(item, i, nextItem, prevItem);
      }
    }
    // Insertion séparée pour pouvoir ajouter en cours de travail
    addInTable(item, arrayIndex, nextItem, prevItem) {
      const chained = {
        type: "accedable-item",
        id: item.id,
        obj: void 0,
        index: arrayIndex,
        next: nextItem ? nextItem.id : void 0,
        prev: prevItem ? prevItem.id : void 0,
        visible: true,
        display: "block",
        selected: false,
        modified: false
      };
      this.keysMap.set(item.id, chained);
      this.arrayItems.push(item);
    }
    DOMElementOf(id) {
      return document.querySelector(`main#items > div[data-id="${id}"]`);
    }
  };

  // src/webviews/services/App.ts
  var App = class _App {
    /**
     * Les méthodes suivantes peuvent s'appeler en tapant simplement leur
     * nom en console (bas des panneaux — 'c' pour rejoindre la console)
     */
    static async openSupport() {
      _App.notify("open-support-folder");
      return "Ouverture du dossier Support";
    }
    static async exportAllData() {
      _App.notify("export-all-data");
      return "Exportation des donn\xE9es demand\xE9e.";
    }
    static async notify(message, params = void 0) {
      const RpcEntry = window.RpcEntry;
      if (RpcEntry) {
        if (params) {
          RpcEntry.notify(message, params);
        } else {
          RpcEntry.notify(message);
        }
      }
    }
    /**
     * 
     * Méthode fonctionnelles
     * 
     * @param code Code à évaluer
     * @returns True si tout s'est bien passé (le code à pu être évalué), False sinon
     * 
     */
    static eval(code) {
      const ok = this.tryEval(code) || this.tryEval("this." + code) || this.tryEval(code + "()") || this.tryEval("this." + code + "()") || console.warn("Code non \xE9valuable dans App : %s", code);
      if (ok) {
        return true;
      } else {
        return false;
      }
    }
    static tryEval(code) {
      try {
        const result = new Function("return " + code).call(this);
        if (void 0 === result) {
          throw new Error("Code qui ne renvoie rien");
        }
        if ("function" === typeof result) {
          result();
        }
        return true;
      } catch (erreur) {
        return false;
      }
    }
  };

  // src/webviews/ConsoleManager.ts
  var ConsoleManager = class {
    constructor(panel) {
      this.panel = panel;
      this.console = panel.consoleInput;
    }
    console;
    history = [];
    ihistory = 0;
    runCode() {
      const code = this.console.value;
      try {
        const result = (0, eval)(code);
        console.log("\xC9valuation du code %s", code, result);
        this.history.push(code);
        this.ihistory = this.history.length;
        this.console.value = "";
      } catch (error) {
        if (false === App.eval(code)) {
          this.panel.flash("Ce code produit une erreur\u2026", "error");
          console.error(code, error);
        }
      }
    }
    setCode() {
      console.log("Console.setCode. History. iHistory", this.history, this.ihistory);
      this.console.value = this.history[this.ihistory];
    }
    backHistory() {
      if (this.ihistory === 0) {
        console.log("Fin de l'historique");
        this.console.value = "";
        return;
      }
      this.ihistory--;
      this.setCode();
    }
    forwardHistory() {
      if (this.ihistory === this.history.length - 1) {
        console.log("Bout de l'historique");
        return;
      }
      this.ihistory++;
      this.setCode();
    }
  };

  // src/webviews/services/HelpManager.ts
  var Help = class _Help {
    constructor(panel) {
      this.panel = panel;
    }
    /**
     * Définitions des aides contextuelles.
     * Soit un simple string (si pas de raccourcis clavier)
     * Soit un array [aide, {lettre: methode-string}] 
     */
    static get CHELPS() {
      return {
        "start": `Pour commencer, activer la fen\xEAtre avec \u23181.

      \xC0 tout moment, vous pouvez obtenir de l'aide contextuelle en tapant "?".
      
      Les raccourcis de base sont les suivants :
      
      **s** : (comme "search") pour rechercher un \xE9l\xE9ment (par filtrage).
      **f**/**k** : pour s\xE9lectionner d'\xE9l\xE9ment en \xE9l\xE9ment en montant et en descendant.
      **n** : (comme "nouveau") pour cr\xE9er un nouvel \xE9l\xE9ment avant la s\xE9lection.
      **e**: (comme "\xE9diter") pour modifier l'\xE9l\xE9ment s\xE9lectionn\xE9.
      
      \xC0 tout moment, taper **?** pour afficher l'aide contextuelle.
      
      ## Backup des donn\xE9es dans fichiers

      Tu peux faire un backup de toutes les donn\xE9es vers des fichiers
      dans le format JSON, YAML, CSV et simple TEXT. Pour ce faire, deux moyens : 

      \u2013 Ouvrez un Terminal \xE0 ce dossier et jouer le script <code>ruby ./src/data/export-data.rb</code>.
      - Taper <code>exportAllData</code> dans la console (<shortcut>c</shortcut> pour rejoindre directement la console).

      Pour ouvrir le dossier support contenant la base et les backups : taper <code>openSupport</code> en console:w
      .

      <button onclick="PanelClient.ici()">Essai fonction Help</button>
      `,
        // Crétation d'un élément
        "create-element": `
      ## Cr\xE9ation d'un \xE9l\xE9ment
      
      Vous pouvez vous d\xE9placer de champ en champ avec les touches <shortcut>a</shortcut>, <shortcut>b</shortcut>, etc. ou la touche tabulation.`,
        // Création d'une œuvre
        "create-oeuvre": `
      ## Cr\xE9ation d'une \u0153uvre

      Jouer la touche <shortcut>n</shortcut> pour cr\xE9er le nouvel \xE9l\xE9ment.

      Une fois le titre rentr\xE9, gr\xE2ce \xE0 la touche <shortcut>i</shortcut>, vous pouvez obtenir les infos qu'on peut trouver sur le net. En pr\xE9cisant l'ann\xE9e (approximative), la langue et/ou le pays, vous pouvez \xEAtre presque certain de trouver l'\u0153uvre du premier coup.

      L'ann\xE9e (approximative \xE0 10 ans pr\xE8s) se met dans le champs d\xE9die, la langue et le pays peuvent s'indiquer dans le champs 'notes' sous la forme JSON. Par exemple <code>{"langue": "en", "pays": "us"}</code>.

      Ensuite, TMDB renvoie la liste de toutes les \u0153uvres correspondantes qu'il a trouv\xE9 et les passe en revue pour choisir laquelle garder. \xC7a se fait en deux temps\xA0:

      - rel\xE8ve de toutes les \u0153uvres, d'un coup, avec infos minimales,
      - on fait un tri par rapport \xE0 celles-ci,
      - TMDB rel\xE8ve les informations compl\xE8tes (principalement les cr\xE9dits),
      - On choisit celle qui correspond vraiment.

      `,
        // ÉDITION d'un élément
        "edit-element": `
      ## \xC9dition d'un \xE9l\xE9ment
      
      Vous pouvez aller de champ en champ avec les touches etc.`,
        // ÉDITION D'UNE OEUVRE
        "edit-oeuve": `
      ## \xC9dition d'une \u0153uvre

      D\xE9placez-vous de champ en champ avec la touche tabulation ou en jouant les lettres en regard des champs.
      `
      };
    }
    /**
     * API
     * Méthode activant l'aide circonstantielle.
     * (voir le manuel)
     */
    activateContextualHelp() {
      const context = this.panel.context;
      const extraParams = this.affineContexte(context);
      const [content, KbBypass] = this.defineCHelp(context, extraParams);
      this.showCHelp(content);
      this.panel.keyManager.keyboardBypass = KbBypass;
    }
    affineContexte(context) {
      switch (context) {
        case "create-new-element":
          return {};
        default:
          return;
      }
    }
    defineCHelp(context, params) {
      const kbb = /* @__PURE__ */ new Map();
      kbb.set("q", this.closeCHelp.bind(this));
      let bypass;
      let content = _Help.CHELPS[context];
      if (Array.isArray(content)) {
        [content, bypass] = content;
        for (var k in bypass) {
          kbb.set(k, bypass[k]);
        }
      }
      return [this.formate(content), kbb];
    }
    formate(str) {
      return str.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/^### (.+)$/g, "<h3>$1</h3>").replace(/^## (.+)$/g, "<h2>$1</h2>").replace(/^# (.+)$/g, "<h1>$1</h1>").split("\n").map((s) => `<div>${s}\xA0</div>`).join("");
    }
    /**
     * Affichage du texte d'aide contextuelle et mise en attente
     * 
     * (note : le "C" de "Chelp" pour "contextual")
     * 
     * @param content Le contenu textuel à afficher
     */
    showCHelp(content) {
      this.CHbuilt || this.CHbuild();
      this.CHObj.classList.remove("hidden");
      const divCont = this.CHObj.querySelector(".content");
      divCont.innerHTML = content;
    }
    CHObj;
    CHbuilt = false;
    closeCHelp() {
      this.CHObj.classList.add("hidden");
    }
    // Construction du div de l'aide contextuelle
    CHbuild() {
      let o = document.createElement("div");
      o.className = "aide-contextuelle hidden";
      let cont = document.createElement("div");
      cont.className = "content";
      o.appendChild(cont);
      let btns = document.createElement("div");
      btns.className = "buttons";
      btns.innerHTML = "q: quitter l\u2019aide";
      o.appendChild(btns);
      document.body.appendChild(o);
      this.CHObj = o;
      this.CHbuilt = true;
    }
  };

  // src/bothside/class_extensions.ts
  Map.prototype.firstValue = function() {
    for (var v of this.values()) {
      return v;
    }
  };

  // src/webviews/PanelClient.ts
  var PanelClient = class {
    // ========== A P I ================
    context = "start";
    form;
    get isActif() {
      return this._actif === true;
    }
    get isInactif() {
      return this._actif === false;
    }
    get keyManager() {
      return this._keyManager;
    }
    // Pour marquer le panneau actif ou inactif
    activate() {
      this.setPanelFocus(true);
    }
    desactivate() {
      this.setPanelFocus(false);
    }
    /**
     * Méthode puissante permettant d'attendre une réaction de l'utilisateur en affichant un 
     * message. Typiquement, c'est le "Pour faire ça, tapez 1, pour faire ça, tapez 2".
     * 
     * Noter que ça n'est pas une méthode asynchrone. Si on l'utilise, c'est à l'ancienne, en
     * arrêtant le flux après elle.
     * 
     * @param msg Le message à afficher
     * @param buttons La table des raccourcis/fonctions qui doivent court-circuiter le fonctionnement
     *    Ils peuvent avoir deux formes : 
     *    - seulement la fonction buttons.set('<touche>', this.<fonction>.bind(this))
     *    - le message et la fonction : buttons.set('<touche>', ['le message', this.<fonction>.bind(this)])
     *      Dans ce dernier cas, le message sera affiché au-dessus et les boutons sous la console, dans la
     *      partie des outils du panneau.
     */
    flashAction(msg, buttons) {
      let realButtons = buttons;
      this.flash(msg, "action");
      if (Array.isArray(buttons.firstValue())) {
        realButtons = /* @__PURE__ */ new Map();
        const outils = [];
        buttons.forEach((ary, lettre) => {
          const [ordre, fonction] = ary;
          outils.push(`<shortcut>${lettre}</shortcut> ${ordre}`);
          realButtons.set(lettre, fonction);
        });
        console.log("outils", outils);
        const o = document.createElement("div");
        o.id = "footer-shortcuts";
        o.innerHTML = outils.join("&nbsp;&nbsp;");
        this.footer.appendChild(o);
      }
      this.keyManager.keyboardBypass = realButtons;
    }
    /**
     * Affichage d'un message en haut du panneau.
     * 
     * @param msg Le message
     * @param type Le type de message
     */
    flash(msg, type) {
      const o = document.createElement("div");
      o.className = type;
      o.innerHTML = msg;
      this.messageBox.appendChild(o);
      this.messageBox.style.zIndex = "10";
      if (type === "notice") {
        setTimeout(() => {
          this.cleanFlash.call(this);
        }, 10 * 1e3);
      } else if (type === "action") {
      } else {
        o.addEventListener("click", (ev) => {
          this.cleanFlash();
        });
      }
    }
    cleanFlash() {
      const msgbox = this.messageBox;
      msgbox.innerHTML = "";
      msgbox.style.zIndex = "-1";
    }
    cleanFooterShortcuts() {
      if (this.footer.querySelector("div#footer-shortcuts")) {
        this.footer.querySelector("div#footer-shortcuts").remove();
      }
    }
    activateContextualHelp() {
      this.help.activateContextualHelp();
    }
    // ========== MÉTHODES D'ÉLÉMENT =============
    // La sélection, sous la forme d'identifiant de l'élément
    selection = void 0;
    getSelection() {
      return this.selection;
    }
    /**
     * Méthode sélectionnant un élément. L'opération est complexe car
     * elle met non seulement en forme l'élément dans le DOM, mais elle
     * conserve en plus l'état de l'élément dans l'accessTable et gère
     * la sélection (sélection qui le moment est simple).
     */
    select(itemId) {
      this.selection && this.deselect(this.selection);
      this.setSelectState(itemId, true);
      this.scrollTo(this._klass.getObj(itemId));
    }
    deselect(itemId) {
      this.setSelectState(itemId, false);
    }
    // Scroll jusqu'à l'élément et le sélectionne
    scrollToAndSelect(itemId) {
      const klass = this._klass;
      const item = klass.get(itemId);
      if (!item) {
        return;
      }
      klass.isVisible(itemId) || klass.setVisible(itemId);
      const ak = klass.getAccKey(itemId);
      this.select(itemId);
    }
    scrollTo(obj) {
      obj.scrollIntoView({ behavior: "auto", block: "center" });
    }
    // Pour peupler le panneau
    populate(accessTable) {
      const container = this.container;
      container.innerHTML = "";
      let index = -1;
      accessTable.each((item) => {
        ++index;
        const clone = this.cloneItemTemplate();
        const mainElement = clone.querySelector("." + this.minName);
        if (mainElement) {
          mainElement.setAttribute("data-id", item.id);
          mainElement.setAttribute("data-index", index.toString());
        }
        Object.keys(item.dbData).forEach((prop) => {
          let value = item.dbData[prop];
          this.setPropValue(clone, item, prop, value);
        });
        Object.keys(item.cachedData).forEach((prop) => {
          let value = item.cachedData[prop];
          this.setPropValue(clone, item, prop, value);
        });
        this.container.appendChild(clone);
      });
      this.afterDisplayItems(accessTable);
      this.observePanel();
    }
    setPropValue(clone, item, prop, value) {
      value = this.formateProp(item, prop, value);
      clone.querySelectorAll(`[data-prop="${prop}"]`).forEach((element) => {
        if (value.startsWith("<")) {
          element.innerHTML = value;
        } else {
          element.textContent = value;
        }
      });
    }
    // ========== PRIVATE METHODS ==============
    // Pour la propriété public keyManager
    initKeyManager() {
      this._keyManager = new VimLikeManager(document.body, this, this._klass);
    }
    setSelectState(itemId, state) {
      const obj = this.accessTable.getObj(itemId);
      obj.classList[state ? "add" : "remove"]("selected");
      this.accessTable.setSelectState(itemId, state);
      this.selection = state ? itemId : void 0;
    }
    cloneItemTemplate() {
      return this.itemTemplate.content.cloneNode(true);
    }
    // Méthode à surclasser pour traitement particulier de certaines valeurs
    // à afficher. Mais normalement, elles sont surtout traitées lors de la
    // mise en cache
    /* surclassed */
    formateProp(item, prop, value) {
      return String(value);
    }
    /* surclassed */
    afterDisplayItems(accessTable) {
    }
    /* surclassed */
    searchMatchingItems(searched) {
      return [];
    }
    observePanel() {
      const field = this.searchInput;
      field.addEventListener("input", this.filterItems.bind(this));
      field.addEventListener("keyup", this.filterItems.bind(this));
      const cons = this.consoleInput;
      cons.addEventListener("keyup", this.watchAndRunConsole.bind(this));
    }
    // Méthode générique de filtrage des items du panneau
    filterItems(ev) {
      const searched = this.searchInput.value.trim();
      const matchingItems = this.searchMatchingItems(searched);
      const matchingCount = matchingItems.length;
      console.log("[CLIENT %s] Filtrage %s - %i founds / %i \xE9l\xE9ment", this.titName, searched, matchingCount, this.accessTable.size);
      const matchingIds = new Set(matchingItems.map((item) => item.id));
      this.accessTable.eachAccKey((ak) => {
        const visible = matchingIds.has(ak.id);
        const display = visible ? "block" : "none";
        if (ak.display !== display) {
          if (ak.obj === void 0) {
            ak.obj = this.accessTable.DOMElementOf(ak.id);
          }
          ak.obj.style.display = display;
          ak.display = display;
          ak.visible = visible;
        }
      });
    }
    filter(accessTable, fnFiltre) {
      return accessTable.findAll(
        (item) => {
          return fnFiltre(item);
        },
        {}
      );
    }
    // ========== PRIVATE PROPERTIES ===========
    get container() {
      return this._container || (this._container = document.querySelector("main#items"));
    }
    get itemTemplate() {
      return this._itemTemplate || (this._itemTemplate = document.querySelector("template#item-template"));
    }
    get searchInput() {
      return this._searchInput || (this._searchInput = document.querySelector("input#search-input"));
    }
    get consoleInput() {
      return this._consInput || (this._consInput = document.querySelector("input#panel-console"));
    }
    get messageBox() {
      return document.querySelector("div#message");
    }
    get footer() {
      return document.querySelector("footer");
    }
    get help() {
      return this._help || (this._help = new Help(this));
    }
    minName;
    titName;
    _klass;
    get accessTable() {
      return {};
    }
    _actif = false;
    _container;
    _itemTemplate;
    _searchInput;
    _consInput;
    _keyManager;
    consoleManager;
    _help;
    constructor(data) {
      this.minName = data.minName;
      this.titName = data.titName;
      this._klass = data.klass;
      this.form = data.form;
    }
    setPanelFocus(actif) {
      document.body.classList[actif ? "add" : "remove"]("actif");
      this._actif = actif;
      this.keyManager.setMode("normal");
    }
    /** 
     * Méthode appelée quand on joue une touche dans la console
     */
    watchAndRunConsole(ev) {
      this.consoleManager || (this.consoleManager = new ConsoleManager(this));
      if (ev.key === "Enter") {
        this.consoleManager.runCode();
      } else if (ev.key === "ArrowDown") {
        this.consoleManager.forwardHistory();
      } else if (ev.key === "ArrowUp") {
        this.consoleManager.backHistory();
      }
    }
  };

  // src/webviews/services/FormManager.ts
  var FormManager = class {
    // table des raccourcis propres
    tablePropertiesByPropName;
    // Fonction pour sauver (appelée quand on sauve la donnée)
    async checkEditedItem() {
      return void 0;
    }
    panel;
    // le panneau contenant le formulaire
    originalData;
    saving = false;
    // Maintenant c'est celui-ci
    editedItem;
    checked = false;
    _obj;
    // le formulaire complet
    get obj() {
      return this._obj || (this._obj = document.querySelector(`form#${this.formId}`));
    }
    // raccourci
    setMode(mode) {
      this.panel.keyManager.setMode(mode);
    }
    /**
     * @api
     * Point d'entrée de l'édition, on envoi l'item à éditer. La manager
     * affiche ses données et affiche le formulaire.
     * 
     * @param item Objet Entry, Oeuvre ou Exemple à éditer/créer
     */
    editItem(item) {
      const isNewItem = item.id === "";
      this.panel.context = isNewItem ? "create-element" : "edit-element";
      const originalData = isNewItem ? {} : structuredClone(item.dbData);
      this.editedItem = Object.assign(originalData, {
        original: structuredClone(originalData),
        changeset: { size: 0, isNew: isNewItem }
      });
      this.openForm();
      this.dispatchValues(this.editedItem);
      if ("function" === typeof this.afterEdit) {
        this.afterEdit.call(this);
      }
      this.setMode("form");
    }
    async saveItem(andQuit) {
      const res = await this.itemIsNotSavable();
      if (res) {
        return;
      }
      let data2save = structuredClone(this.editedItem.changeset);
      this.editedItem.data2save = data2save;
      const map = /* @__PURE__ */ new Map();
      map.set("o", this.onConfirmSave.bind(this, andQuit));
      map.set("n", this.cancelEdit.bind(this));
      this.panel.flashAction(
        "<b>\u{1F44D} Donn\xE9e valid\xE9e \u{1F389}</b><br />Confirmes-tu la sauvegarde ? (o = oui, n = non)",
        map
      );
    }
    async itemIsNotSavable() {
      this.panel.cleanFlash();
      this.collectValues();
      const item = this.editedItem;
      this.properties.forEach((dproperty) => {
        const prop = dproperty.propName;
        if (item[prop] !== item.original[prop]) {
          Object.assign(this.editedItem.changeset, {
            [prop]: item[prop],
            size: ++item.changeset.size
          });
        }
      });
      console.log("Item \xE0 enregistrer", this.editedItem);
      if (this.itemIsEmpty()) {
        this.panel.flash("Aucune donn\xE9e n'a \xE9t\xE9 founie\u2026", "error");
        return true;
      }
      if (this.editedItem.changeset.size === 0) {
        this.panel.flash("Les donn\xE9es n'ont pas chang\xE9\u2026", "warn");
        return true;
      }
      let invalidity = await this.checkEditedItem();
      console.log("=== FIN DU CHECK DE L'ITEM ===");
      if (invalidity) {
        this.panel.flash("Les donn\xE9es sont invalides : " + invalidity, "error");
        return true;
      }
      return false;
    }
    async onConfirmSave(andQuit) {
      console.log("Sauvegarde confirm\xE9e");
      const fakeItem = this.collectValues();
      await this.onSaveEditedItem();
      this.saving = false;
      if (andQuit) {
        this.closeForm();
      }
    }
    itemIsEmpty() {
      var isEmpty = true;
      const item = this.editedItem;
      this.properties.forEach((dprop) => {
        if (!isEmpty) {
          return;
        }
        if (item[dprop.propName] !== "") {
          isEmpty = false;
        }
      });
      return isEmpty;
    }
    cancelEdit() {
      console.log("Sauvegarde annul\xE9e");
      this.saving = false;
      this.__onCancel();
    }
    // Met les données dans le formulaire
    dispatchValues(data) {
      this.reset();
      this.properties.forEach((dprop) => {
        const prop = dprop.propName;
        if (data[prop]) {
          console.log("Propri\xE9t\xE9 %s mise \xE0 %s", prop, data[prop]);
          dprop.field.value = String(data[prop]);
        } else {
          console.log("La valeur de la propri\xE9t\xE9 %s n'est pas d\xE9finie dans ", prop, data);
        }
      });
    }
    // Retourne le champ de la propriété +prop+
    // (note : ces champs ont été vérifiés au début)
    field(prop) {
      if (false === this.domCache.has(prop)) {
        const sel = `#${this.prefix}-${prop}`;
        const fld = this.obj.querySelector(sel);
        fld || console.error("Bizarrement, le champ %s est introuvable (%s)", sel, prop);
        this.domCache.set(prop, fld);
      }
      return this.domCache.get(prop);
    }
    domCache = /* @__PURE__ */ new Map();
    // Récupère les données dans le formulaire et retourne l'item
    // avec ses nouvelles données.
    collectValues() {
      this.properties.forEach((dprop) => {
        const prop = dprop.propName;
        const value = this.getValueOf(dprop);
        Object.assign(this.editedItem, { [prop]: value });
      });
    }
    /**
     * Pendant de la précédente, donne la valeur +value+ à la propriété
     * +property+
     */
    setValueOf(property, value) {
      const propData = this.tablePropertiesByPropName.get(property);
      switch (propData.fieldType) {
        case "checkbox":
        case "radio":
          propData.field.checked = value;
          break;
        default:
          propData.field.value = value;
      }
    }
    /**
     * Retourne la valeur de la propriété +foo+
     * 
     * @param foo Nom de la propriété dont il faut retourne la valeur
     * @returns Retourne la valeur de la propriété en fonction de son type
     */
    getValueOf(foo) {
      if ("string" === typeof foo) {
        return this.getValueOfByPropName(foo);
      } else {
        return this.getValueOfByPropData(foo);
      }
    }
    getValueOfByPropName(propName) {
      const propData = this.tablePropertiesByPropName.get(propName);
      return this.getValueOfByPropData(propData);
    }
    getValueOfByPropData(property) {
      const prop = property.propName;
      const field = this.field(prop);
      let value = ((ft) => {
        switch (ft) {
          case "checkbox":
            return field.checked;
          case "radio":
            return field.checked;
          default:
            return field.value;
        }
      })(property.fieldType);
      return value;
    }
    openForm() {
      this.checked || this.checkFormManagerValidity();
      if (this.checked === false) {
        return;
      }
      this.obj.classList.remove("hidden");
    }
    closeForm() {
      this.obj.classList.add("hidden");
      this.setMode("normal");
    }
    // Tout remettre à rien (vider les champs)
    reset() {
      this.properties.forEach((dprop) => {
        switch (dprop.fieldType) {
          case "checkbox":
            dprop.field.checked = dprop.default || false;
            break;
          case "textarea":
            dprop.field.value = "";
            break;
          case "select":
            dprop.field.selectedIndex = 0;
            break;
          default:
            dprop.field.value = dprop.default || "";
        }
      });
    }
    async __onSaveEditedItem() {
      return this.saveItem(false);
    }
    async __onSaveEditedItemAndQuit() {
      await this.saveItem(true);
    }
    __onCancel() {
      this.closeForm();
    }
    __onFocusOnForm(ev) {
      if ("function" === typeof this.onFocusForm) {
        this.onFocusForm.call(this, ev);
      }
      this.panel.keyManager.setMode("form");
    }
    setPanel(panel) {
      this.panel = panel;
    }
    // === MÉTHODES DE VALIDATION DES DONNÉES D'IMPLÉMENTATION ===
    // (les données suivantes s'assurent que le formulaire est
    //  conforme aux attentes)
    // La méthode sert aussi à observer les éléments
    checkFormManagerValidity() {
      if (!this.obj) {
        console.error("Le formulaire form#%s est introuvable.", this.formId);
        return false;
      }
      if (false === this.checkBoutonsValidity()) {
        return false;
      }
      this.inscritAideInFooter();
      this.observeButtons();
      if (false === this.checkPropertiesValidity()) {
        return false;
      }
      console.info("Formulaire %s valide.", this.formId);
      this.__observeForm();
      this.observeForm();
      this.checked = true;
    }
    inscritAideInFooter() {
      let aide = "<shortcut>q</shortcut> : Renoncer | <shortcut>s</shortcut> : Enregistrer | <shortcut>w</shortcut> : Enregistrer et finir";
      this.obj.querySelector("div#footer").innerHTML = aide;
    }
    checkBoutonsValidity() {
      let ok = true;
      return ok;
    }
    // Observation du formulaire
    __observeForm() {
      this.obj.querySelectorAll('text[type="text"]').forEach((o) => {
        o.addEventListener("focus", (ev) => {
          o.select();
        });
      });
      this.panel.keyManager.discrimineFieldsForModeIn(this.obj, { edit: "edit", normal: "form" });
    }
    focusField(indice) {
      const dproperty = this.properties[indice - 1];
      if (!dproperty) {
        return;
      }
      dproperty.field.focus();
    }
    // S'il y a un champ d'identifiant, cette fonction permet de le déloquer
    toggleIdLock() {
      const idField = this.field("id");
      if (!idField) {
        return;
      }
      let isLocked = idField.dataset.state === "locked";
      this.setIdLock(!isLocked);
    }
    setIdLock(isLocked) {
      const idField = this.field("id");
      idField.dataset.state = isLocked ? "locked" : "unlocked";
      idField.disabled = isLocked;
      const btn = this.obj.querySelector(".btn-lock-id");
      if (btn) {
        idField.innerHTML = isLocked ? "\u{1F512}" : "\u{1F513}";
      }
    }
    // Observation des boutons principaux
    observeButtons() {
    }
    checkPropertiesValidity() {
      let ok = true;
      const lettres = "abcdefghijkl".split("").reverse();
      this.tablePropertiesByPropName = /* @__PURE__ */ new Map();
      this.properties.forEach((dproperty) => {
        const prop = dproperty.propName;
        this.tablePropertiesByPropName.set(prop, dproperty);
        const prefix = this.prefix;
        const prefprop = `${prefix}-${prop}`;
        const container = this.obj.querySelector(`#${prefprop}-container`);
        const label = container.querySelector("label");
        const shortcut = "<shortcut>" + lettres.pop() + "</shortcut>\xA0";
        label.innerHTML = shortcut + label.innerHTML;
        if (container) {
          Object.assign(dproperty, { container });
        } else {
          console.error('La propri\xE9t\xE9 "%s" devrait \xEAtre dans un conteneur d\u2019identifiant "#%s-container"', prop, prefprop);
          ok = false;
        }
        let propTag = String(dproperty.fieldType);
        if (["text", "checkbox", "radio"].includes(propTag)) {
          propTag = "input";
        }
        const fieldSelector = `${propTag}#${prefprop}`;
        let propField = this.obj.querySelector(fieldSelector);
        if (propField) {
          switch (dproperty.fieldType) {
            case "checkbox":
              propField = propField;
              break;
            case "textarea":
              propField = propField;
              break;
            default:
              propField = propField;
          }
          Object.assign(dproperty, { field: propField });
          if (dproperty.onChange) {
            propField.addEventListener("change", dproperty.onChange);
          }
        } else {
          console.error("Le champ %s pour la propri\xE9t\xE9 %s devrait exister.", fieldSelector, prop);
          ok = false;
        }
        if (dproperty.fieldType === "select") {
          if (dproperty.values) {
            const field = dproperty.field;
            field.innerHTML = "";
            dproperty.values.forEach((paire) => {
              let [value, title] = paire;
              title = title || value;
              const opt = document.createElement("option");
              opt.value = value;
              opt.innerHTML = title;
              field.appendChild(opt);
            });
          } else {
            console.error("Le champ %s, de type select, devrait d\xE9finir ses valeurs (values)", prop);
            ok = false;
          }
        }
      });
      return ok;
    }
  };

  // src/webviews/models/ExempleForm.ts
  var ExempleForm = class extends FormManager {
    formId = "exemple-form";
    prefix = "exemple";
    properties = [];
    // Table des raccourcis 'one key' propre au formulaire
    tableKeys = {
      // <touche>: <fonction bindée>, par exemple
      // 'i': this.showInfo.bind(this)
    };
    async checkEditedItem() {
      return "Les donn\xE9es ne sont pas check\xE9s";
    }
    async onSaveEditedItem() {
      console.log("Il faut que j'apprendre \xE0 sauver l'exemple : ", this.editedItem);
      return true;
    }
    observeForm() {
    }
    afterEdit() {
    }
  };

  // src/webviews/models/Exemple.ts
  var Exemple = class _Exemple extends ClientItem {
    // Constructor and data access
    // Mais bon… on s'en sert le moins possible
    constructor(data) {
      super(data);
      this.data = data;
    }
    type = "exemple";
    static minName = "exemple";
    static klass = _Exemple;
    static currentItem;
    // Getters pour accès direct aux propriétés courantes
    get oeuvre_id() {
      return this.data.dbData.oeuvre_id;
    }
    get indice() {
      return this.data.dbData.indice;
    }
    get entry_id() {
      return this.data.dbData.entry_id;
    }
    get content() {
      return this.data.dbData.content;
    }
    get notes() {
      return this.data.dbData.notes;
    }
    static setAccessTableWithItems(items) {
      this._accessTable = new AccessTable(items);
    }
    static _accessTable;
    static doExemplesExist(exemples) {
      const resultat = { known: [], unknown: [] };
      exemples.forEach((paire) => {
        const [oeuvreId, exIndice] = paire;
        const paireStr = paire.join(":");
        if (this.exempleExists(oeuvreId, Number(exIndice))) {
          resultat.known.push(paireStr);
        } else {
          resultat.unknown.push(paireStr);
        }
      });
      return resultat;
    }
    static exempleExists(oeuvreId, exIndice) {
      return !!this.accessTable.exists(`${oeuvreId}-${exIndice}`);
    }
  };
  var ExemplePanelClass = class extends PanelClient {
    get accessTable() {
      return Exemple.accessTable;
    }
    modeFiltre = "by-title";
    BlockTitres = /* @__PURE__ */ new Map();
    initialize() {
      document.querySelector("#search-by-div").classList.remove("hidden");
    }
    // Certaines propriétés reçoivent un traitement particulier :
    // - l'entrée reçoit un lien pour rejoindre la définition dans le panneau des définitions
    formateProp(ex, prop, value) {
      switch (prop) {
        case "entree_formated":
          return `<a data-type="entry" data-id="${ex.dbData.entry_id}">${value}</a>`;
        default:
          return String(value);
      }
    }
    observePanel() {
      super.observePanel();
      this.menuModeFiltre.addEventListener("change", this.onChangeModeFiltre.bind(this));
      this.container.querySelectorAll("a[data-type][data-id]").forEach((link) => {
        link.addEventListener("click", this.onClickLinkToEntry.bind(this, link));
      });
    }
    onClickLinkToEntry(link, _ev) {
      const entryId = link.dataset.id;
      console.log("[CLIENT] Demande d'affichage de l'entr\xE9e '%s'", entryId);
      RpcEx.notify("display-entry", { entry_id: entryId });
    }
    onClickLinkToOeuvre(obj, _ev) {
      const oeuvreId = obj.dataset.id;
      console.log("[CLIENT Exemple] Demande d'affichage de l'\u0153uvre %s", oeuvreId);
      RpcEx.notify("display-oeuvre", { oeuvreId });
    }
    onChangeModeFiltre(_ev) {
      this.modeFiltre = this.menuModeFiltre.value;
      console.info("Le mode de filtrage a \xE9t\xE9 mis \xE0 '%s'", this.modeFiltre);
    }
    get menuModeFiltre() {
      return document.querySelector("#search-by");
    }
    /**
     * Appelée après l'affichage des exemples, principalement pour
     * afficher les titres des oeuvres dans le DOM.
     */
    afterDisplayItems(accessTable) {
      let currentOeuvreId = "";
      accessTable.each((item) => {
        const ditem = item;
        if (ditem.dbData.oeuvre_id === currentOeuvreId) {
          return;
        }
        currentOeuvreId = ditem.dbData.oeuvre_id;
        const obj = document.createElement("h2");
        obj.dataset.id = currentOeuvreId;
        obj.addEventListener("click", this.onClickLinkToOeuvre.bind(this, obj));
        obj.className = "titre-oeuvre";
        const spanTit = document.createElement("span");
        spanTit.className = "titre";
        spanTit.innerHTML = ditem.cachedData.oeuvre_titre;
        obj.appendChild(spanTit);
        const titre = {
          id: ditem.dbData.oeuvre_id,
          obj,
          titre: ditem.cachedData.oeuvre_titre,
          display: "block"
        };
        this.BlockTitres.set(titre.id, titre);
        const firstEx = document.querySelector(`main#items > div[data-id="${ditem.dbData.id}"]`);
        this.container.insertBefore(obj, firstEx);
      });
    }
    initKeyManager() {
      this._keyManager = new VimLikeManager(document.body, this, Exemple);
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
     */
    searchMatchingItems(searched) {
      const searchLow = StringNormalizer.toLower(searched);
      const searchRa = StringNormalizer.rationalize(searched);
      let exemplesFound;
      switch (this.modeFiltre) {
        case "by-title":
          exemplesFound = this.filter(Exemple.accessTable, (ex) => {
            return ex.cachedData.titresLookUp.some((titre) => {
              return titre.substring(0, searchLow.length) === searchLow;
            });
          });
          break;
        case "by-entry":
          exemplesFound = this.filter(Exemple.accessTable, (ex) => {
            const seg = ex.cachedData.entry4filter.substring(0, searchLow.length);
            return seg === searchLow || seg === searchRa;
          });
          break;
        case "by-content":
          exemplesFound = this.filter(Exemple.accessTable, (ex) => {
            console.log("ex", ex);
            ex = ex;
            return ex.cachedData.content_min.includes(searchLow) || ex.cachedData.content_min_ra.includes(searchRa);
          });
          break;
        default:
          return [];
      }
      const titres2aff = /* @__PURE__ */ new Map();
      exemplesFound.forEach((ex) => {
        if (titres2aff.has(ex.dbData.oeuvre_id)) {
          return;
        }
        titres2aff.set(ex.dbData.oeuvre_id, true);
      });
      this.BlockTitres.forEach((btitre) => {
        const dispWanted = titres2aff.has(btitre.id) ? "block" : "none";
        if (btitre.display === dispWanted) {
          return;
        }
        btitre.display = dispWanted;
        btitre.obj.style.display = dispWanted;
      });
      return exemplesFound;
    }
  };
  var ExemplePanel = new ExemplePanelClass({
    minName: "exemple",
    titName: "Exemples",
    klass: Exemple,
    form: new ExempleForm()
  });
  Exemple.panel = ExemplePanel;
  var RpcEx = createRpcClient();
  RpcEx.on("activate", () => {
    if (ExemplePanel.isActif) {
      return;
    }
    console.log("[CLIENT EXEMPLES] Je dois marquer le panneau Ex actif");
    ExemplePanel.activate();
  });
  RpcEx.on("desactivate", () => {
    if (ExemplePanel.isInactif) {
      return;
    }
    console.log("[CLIENT EXEMPLES] Je dois marquer le panneau Ex comme inactif.");
    ExemplePanel.desactivate();
  });
  RpcEx.on("populate", (params) => {
    const items = Exemple.deserializeItems(params.data);
    ExemplePanel.populate(Exemple.accessTable);
    ExemplePanel.initialize();
    ExemplePanel.initKeyManager();
  });
  RpcEx.on("check-exemples", (params) => {
    console.log("[PANNEAU EXEMPLE] Demande de v\xE9rification des exemples :", params.exemples);
    const resultat = Exemple.doExemplesExist(params.exemples);
    console.log("R\xE9sultat du check", resultat);
    RpcEx.notify("check-exemples-resultat", { CRId: params.CRId, resultat });
  });
  window.Exemple = Exemple;
})();
//# sourceMappingURL=exemples-bundle.js.map
