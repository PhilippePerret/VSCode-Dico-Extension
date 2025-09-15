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
    static klass;
    static get accessTable() {
      return this._accessTable;
    }
    static panel;
    static _accessTable;
    static _selector;
    static get Selector() {
      return this._selector || (this._selector = new SelectionManager(this.klass));
    }
    // Raccourcis vers l'accessTable, pour obtenir des informations
    // sur les items ou les items eux-même
    static get(itemId) {
      return this.accessTable.getById(itemId);
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
      this.panel.form.editItem(new this.klass({ id: "" }));
    }
    toRow() {
      return {};
    }
    /**
     * Méthode qui reçoit les items sérialisés depuis l'extension et va les
     * consigner dans le panneau, dans une AccessTable qui permettra de 
     * parcourrir les éléments. 
     */
    static deserializeItems(items, klass) {
      const allItems = items.map((item) => new this.klass(JSON.parse(item)));
      this.klass.setAccessTable(allItems);
    }
    data;
    constructor(itemData) {
      this.data = itemData;
    }
    // Pour obtenir l'AccKey (ak) de l'item
    static getAccKey(id) {
      return this.accessTable.getAccKeyById(id);
    }
    // public get obj(){ return this._obj ;}
    // protected get isNotVisible(){ return this._visible === false;}
    // protected get isVisible(){ return this._visible === true ;}
    // private _obj!: HTMLDivElement;
    // private _visible: boolean = true;
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

  // src/webviews/services/AccessTable.ts
  var AccessTable = class {
    constructor(klass, items) {
      this.klass = klass;
      this.populateInTable(items);
    }
    keysMap = /* @__PURE__ */ new Map();
    arrayItems = [];
    _size;
    // après un ajout ou une suppression, par exemple
    reset() {
      this._size = null;
    }
    get size() {
      return this._size || (this._size = this.keysMap.size);
    }
    isVisible(id) {
      return this.getAccKeyById(id).visible === true;
    }
    setVisibility(id, state) {
      const ak = this.getAccKeyById(id);
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
        nextItemVisible = this.getNextVisibleById(selection);
        if (nextItemVisible) {
          nextId = nextItemVisible.data.id;
        }
      }
      nextId = nextId || this.firstItem.data.id;
      panel.select(nextId);
    }
    selectPrevItem(panel) {
      const selection = panel.getSelection();
      let prevId;
      if (selection) {
        let prevItemVisible;
        prevItemVisible = this.getPrevVisibleById(selection);
        if (prevItemVisible) {
          prevId = prevItemVisible.data.id;
        }
      }
      prevId = prevId || this.firstItem.data.id;
      panel.select(prevId);
    }
    getNextVisibleById(refId) {
      let ak;
      let nextAk;
      while (ak = this.getNextAccKeyById(refId)) {
        if (ak.visible) {
          return this.getById(ak.id);
        }
      }
    }
    getPrevVisibleById(refId) {
      let ak;
      let prevAk;
      while (ak = this.getPrevAccKeyById(refId)) {
        if (ak.visible) {
          return this.getById(ak.id);
        }
      }
    }
    setSelectState(id, state) {
      this.getAccKeyById(id).selected = state;
    }
    traverseAnyTypeWith(value, fnIfId, fnIfIndex, fnIfAccKey, fnIfItem) {
      switch (typeof value) {
        case "string":
          return fnIfId(value);
        case "number":
          return fnIfIndex(value);
        case "object":
          switch (value.type) {
            case "accedable-item":
              return fnIfAccKey(value);
            case "entry":
            case "oeuvre":
            case "exemple":
              return fnIfItem(value);
          }
      }
    }
    /**
     * Retourne l'item d'identifiant +id+ 
     * 
     * On peut l'obtenir en envoyant l'identifiant (string), l'index dans
     * la liste (number), l'accedable-key (AccedableItem) ou l'item 
     * lui-même.
     */
    get(foo) {
      return this.traverseAnyTypeWith(
        foo,
        this.getById.bind(this),
        this.getByIndex.bind(this),
        this.getByAccKey.bind(this),
        (foo2) => {
          return foo2;
        }
      );
    }
    // @return true si l'élément d'identifiant +id+ existe.
    existsById(id) {
      return this.keysMap.has(id);
    }
    getById(id) {
      return this.arrayItems[this.keysMap.get(id).index];
    }
    getByIndex(index) {
      return this.arrayItems[index];
    }
    getByAccKey(ak) {
      return this.getById(ak.id);
    }
    /**
     * Retourne l'objet DOM de l'item en s'assurant qu'il est défini
     * dans l'AccKey (ce qui n'est pas fait par défaut)
     */
    getObj(id) {
      const ak = this.getAccKeyById(id);
      if (!ak) {
        console.error("Impossible d'obtenir l'AK de l'id '%s'\u2026", id, this.arrayItems);
      }
      ak.obj || Object.assign(ak, { obj: this.DOMElementOf(id) });
      if (!ak.obj) {
        console.error("Impossible d'obtenir l'objet de l'item '%'\u2026", id);
      }
      return ak.obj;
    }
    /**
     *  Retourne l'accKey de l'élément foo
     * TODO : doit fonctionner pour tout élément (cf. getNextAccKey)
     */
    getAccKey(foo) {
      return this.traverseAnyTypeWith(
        foo,
        this.getAccKeyById.bind(this),
        this.getAccKeyByIndex.bind(this),
        (foo2) => {
          return foo2;
        },
        this.getAccKeyByItem.bind(this)
      );
    }
    getAccKeyById(itemId) {
      return this.keysMap.get(itemId);
    }
    getAccKeyByIndex(index) {
      return this.getAccKeyById(this.getByIndex(index).data.id);
    }
    getAccKeyByItem(item) {
      return this.getAccKeyById(item.data.id);
    }
    /**
     *  Retourne l'Item (Entry, Oeuvre, Exemple) de l'élément foo
     */
    getNextItem(foo) {
      return this.traverseAnyTypeWith(
        foo,
        this.getNextItemById.bind(this),
        this.getNextItemByIndex.bind(this),
        this.getNextItemByAccKey.bind(this),
        this.getNextItemByItem.bind(this)
      );
    }
    getNextItemById(id) {
      const nextAK = this.getNextAccKeyById(id);
      return nextAK ? this.getById(nextAK.id) : void 0;
    }
    getNextItemByIndex(index) {
      return this.getNextItemById(this.arrayItems[index].data.id);
    }
    getNextItemByAccKey(ak) {
      return ak.next ? this.getById(ak.next) : void 0;
    }
    getNextItemByItem(item) {
      return this.getNextItemById(item.data.id);
    }
    /**
     *  Retourne l'Item (Entry, Oeuvre, Exemple) qui suit l'élément
     * défini par +foo+ qui peut être l'id, l'index, l'accessKey
     * {AccedableItem} ou l'item lui-mêmeK
     */
    getPrevItem(foo) {
      return this.traverseAnyTypeWith(
        foo,
        this.getPrevItemById.bind(this),
        this.getPrevItemByIndex.bind(this),
        this.getPrevItemByAccKey.bind(this),
        this.getPrevItemByItem.bind(this)
      );
    }
    getPrevItemById(id) {
      const prevAK = this.getPrevAccKeyById(id);
      return prevAK ? this.getById(prevAK.id) : void 0;
    }
    getPrevItemByIndex(index) {
      return this.getPrevItemById(this.arrayItems[index].data.id);
    }
    getPrevItemByAccKey(ak) {
      return ak.prev ? this.getById(ak.prev) : void 0;
    }
    getPrevItemByItem(item) {
      return this.getPrevItemById(item.data.id);
    }
    /**
     *  Retourne l'accedableKey {AccedableItem} de l'élément désigné
     * par +foo+ qui peut être l'identifiant, l'index, l'access-key ou
     * l'item lui-même de l'item de référence. 
     *
     * Note : la version LA PLUS RAPIDE (O)1 consiste à fournir l'IDENTIFIANT
     * 
     */
    getNextAccKey(foo) {
      return this.traverseAnyTypeWith(
        foo,
        this.getNextAccKeyById.bind(this),
        this.getNextAccKeyByIndex.bind(this),
        this.getNextAccKeyByAccKey.bind(this),
        this.getNextAccKeyByItem.bind(this)
      );
    }
    getNextAccKeyById(id) {
      const ak = this.getAccKey(id);
      return ak.next ? this.getAccKey(ak.next) : void 0;
    }
    getNextAccKeyByIndex(index) {
      return this.getNextAccKeyById(this.arrayItems[index].data.id);
    }
    getNextAccKeyByAccKey(ak) {
      return ak.next ? this.getNextAccKeyById(ak.next) : void 0;
    }
    getNextAccKeyByItem(item) {
      return this.getNextAccKeyById(item.data.id);
    }
    /**
     * Retourne l'AccessKey {AccedableItem} précédent de l'élément 
     * désigné par +foo+ qui peut être l'id, l'index, l'access-key ou
     * l'item lui-même de l'élément.
     */
    getPrevAccKey(foo) {
      return this.traverseAnyTypeWith(
        foo,
        this.getPrevAccKeyById.bind(this),
        this.getPrevAccKeyByIndex.bind(this),
        this.getPrevAccKeyByAccKey.bind(this),
        this.getPrevAccKeyByItem.bind(this)
      );
    }
    getPrevAccKeyById(id) {
      const ak = this.getAccKey(id);
      return ak.prev ? this.getAccKey(ak.prev) : void 0;
    }
    getPrevAccKeyByIndex(index) {
      return this.getPrevAccKeyById(this.arrayItems[index].data.id);
    }
    getPrevAccKeyByAccKey(ak) {
      return ak.prev ? this.getPrevAccKeyById(ak.prev) : void 0;
    }
    getPrevAccKeyByItem(item) {
      return this.getPrevAccKeyById(item.data.id);
    }
    // Boucle sur tous les éléments (sans retour)
    each(traverseMethod) {
      this.eachSince(traverseMethod, this.firstItem.data.id);
    }
    // Boucle depuis l'élément d'identifiant +id+
    eachSince(traverseMethod, id) {
      let item = this.getById(id);
      do {
        if (item) {
          traverseMethod(item);
          item = this.getNextItemById(item.data.id);
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
      let item = this.getById(id);
      do {
        if (item) {
          let retour = traverseMethod(item);
          collected.push(retour);
          item = this.getNextItemById(item.data.id);
        } else {
          break;
        }
      } while (item);
      return collected;
    }
    // Boucle sur TOUTES les données en collectant une donnée
    map(traverseMethod) {
      return this.mapSince(traverseMethod, this.firstItem.data.id);
    }
    /**
     * Méthode qui boucle sur tous les éléments depuis l'élément d'id
     * +itemId+ et retourne une Map avec en clé l'identifiant de
     * l'item et en valeur la valeur retournée par la méthode
     * +traverseMethod+
     */
    collectSince(traverseMethod, itemId) {
      const collected = /* @__PURE__ */ new Map();
      let item = this.getById(itemId);
      do {
        if (item) {
          let retour = traverseMethod(item);
          collected.set(item.data.id, retour);
          item = this.getNextItemById(item.data.id);
        } else {
          break;
        }
      } while (item);
      return collected;
    }
    // Boucle sur tous les éléments en récoltant une valeur qu'on met
    // dans une Map qui a en clé l'identifiant de l'item
    collect(traverseMethod) {
      return this.collectSince(traverseMethod, this.firstItem.data.id);
    }
    /**
     * Retourne le premier item. Par convention, c'est le premier
     * de la liste.
     */
    get firstItem() {
      return this.arrayItems[0];
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
        item = this.getNextItemById(id);
      }
      let found;
      do {
        if (item) {
          if (condition(item) === true) {
            found = item;
            break;
          }
          item = this.getNextItemById(item.data.id);
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
        item = this.getNextItemById(id);
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
          item = this.getNextItemById(item.data.id);
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
        const chained = {
          type: "accedable-item",
          id: item.data.id,
          obj: void 0,
          index: i,
          next: nextItem ? nextItem.data.id : void 0,
          prev: prevItem ? prevItem.data.id : void 0,
          visible: true,
          display: "block",
          selected: false,
          modified: false
        };
        this.keysMap.set(item.data.id, chained);
        this.arrayItems.push(item);
      }
    }
    DOMElementOf(id) {
      return document.querySelector(`main#items > div[data-id="${id}"]`);
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
        console.log("\xC9valuation du code %s", code, (0, eval)(code));
        this.history.push(code);
        this.ihistory = this.history.length;
        this.console.value = "";
      } catch (error) {
        console.error("Une erreur s'est produite en \xE9valuant le cde : ", code, error);
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
      
      \xC0 tout moment, taper **?** pour afficher l'aide contextuelle.`,
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
      return str.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<em>$1</em>").split("\n").map((s) => `<div>${s}\xA0</div>`).join("");
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
      console.info("[VimLikeManager mode] Mise du mode \xE0 '%s')", mode);
      this._mode = mode;
      switch (mode) {
        case "edit":
          console.log("[VimLikeManager.mode] Passage du mode clavier au mode edit");
          this._keylistener = this.onKeyDownModeEdit.bind(this);
          break;
        case "normal":
          console.log("[VimLikeManager.mode] Passage du mode clavier au mode normal");
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
      console.log("[universel capture (mode %s)] Key up = ", this.mode, ev.key, ev);
      if (ev.key === "?") {
        this.panel.activateContextualHelp();
        return stopEvent(ev);
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
      console.log("-> VimLikeManager.onKeyDownModeNormal", ev.key, ev);
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
        const data = item.data;
        const clone = this.cloneItemTemplate();
        const mainElement = clone.querySelector("." + this.minName);
        if (mainElement) {
          mainElement.setAttribute("data-id", data.id);
          mainElement.setAttribute("data-index", index.toString());
        }
        Object.keys(data).forEach((prop) => {
          let value = data[prop];
          value = this.formateProp(item, prop, value);
          clone.querySelectorAll(`[data-prop="${prop}"]`).forEach((element) => {
            if (value.startsWith("<")) {
              element.innerHTML = value;
            } else {
              element.textContent = value;
            }
          });
        });
        this.container.appendChild(clone);
      });
      this.afterDisplayItems(accessTable);
      this.observePanel();
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
      const matchingIds = new Set(matchingItems.map((item) => item.data.id));
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
      console.log("[setPanelFocus] Focus mis sur le panneau %s", this.titName);
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

  // src/bothside/UConstants.ts
  var Constants = class {
    static ENTRIES_GENRES = {
      "nm": "n.m.",
      "nmp": "n.m.pl.",
      "nf": "n.f.",
      "np": "n.pl.",
      "vb": "verbe",
      "adj": "adj.",
      "adv": "adv."
    };
    /**
     * Les préfixes/marques qui introduisent des index dans les définitions
     * principalement. Permet, par exemple dans le check des valeurs des
     * définitions, de vérifier l'existence des mots référencés.
     * 
     * Leur forme canonique est :
     * 
     *  <mark>(<id entrée>) ou <mark>(<texte écrit>|<id entrée>)
     */
    static MARK_ENTRIES = {
      "->": { name: "Envoi simple" },
      "index": { name: "Simple indexation" },
      "tt": { name: "simple terme technique (sans page)" }
    };
  };

  // src/webviews/services/ComplexRpc.ts
  var ComplexRpc = class _ComplexRpc {
    static requestTable = /* @__PURE__ */ new Map();
    static addRequest(req) {
      this.requestTable.set(req.id, req);
    }
    // À appeler à la fin, pour résoudre
    static resolveRequest(requestId, params) {
      this.requestTable.get(requestId).resolve(params);
    }
    id;
    call;
    // Fonction qui va lancer l'appel (reçoit en DERNIER argument l'identifiant de cette instance — pour le transmettre)
    ok;
    // le 'resolve' de new Promise((resolve, reject) => {})
    ko;
    // le reject de new Promise((resolve,reject) => {})
    constructor(param) {
      this.id = crypto.randomUUID();
      this.call = param.call;
      _ComplexRpc.addRequest(this);
    }
    run() {
      return new Promise((ok, ko) => {
        this.ok = ok;
        this.ko = ko;
        setTimeout(this.ko.bind(this, "timeout-20"), 10 * 1e4);
        this.call(this.id);
      });
    }
    resolve(params) {
      this.ok(params);
    }
  };

  // src/webviews/services/FormManager.ts
  var FormManager = class {
    // table des raccourcis propres
    tablePropertiesByPropName;
    isNewItem;
    // Fonction pour sauver (appelée quand on sauve la donnée)
    async checkItem(item) {
      return void 0;
    }
    panel;
    // le panneau contenant le formulaire
    originalData;
    saving = false;
    // L'item qui sera travaillé ici, pour ne pas toucher l'item original
    fakeItem;
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
      this.panel.context = item.data.id === "" ? "create-element" : "edit-element";
      this.originalData = item.data;
      this.isNewItem = !item.data.id;
      this.openForm();
      this.dispatchValues(item.data);
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
      const fakeItem = this.collectValues();
      if (!this.originalData.id) {
        Object.assign(fakeItem, { isNew: true });
      }
      const changeset = /* @__PURE__ */ new Map();
      this.properties.forEach((dproperty) => {
        const prop = dproperty.propName;
        if (fakeItem[prop] !== this.originalData[prop]) {
          changeset.set(prop, fakeItem[prop]);
        }
      });
      Object.assign(fakeItem, {
        changeset,
        original: this.originalData
      });
      console.log("Item \xE0 enregistrer", fakeItem);
      if (this.itemIsEmpty(fakeItem)) {
        this.panel.flash("Aucune donn\xE9e n'a \xE9t\xE9 founie\u2026", "error");
        return true;
      }
      if (changeset.size === 0) {
        this.panel.flash("Les donn\xE9es n'ont pas chang\xE9\u2026", "warn");
        return true;
      }
      let invalidity = await this.checkItem(fakeItem);
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
      await this.onSave(fakeItem);
      this.saving = false;
      if (andQuit) {
        this.closeForm();
      }
    }
    itemIsEmpty(fakeItem) {
      var isEmpty = true;
      this.properties.forEach((dprop) => {
        if (fakeItem[dprop.propName] !== "") {
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
      this.fakeItem = {};
      this.properties.forEach((dprop) => {
        const prop = dprop.propName;
        const value = this.getValueOf(dprop);
        Object.assign(this.fakeItem, { [prop]: value });
      });
      return this.fakeItem;
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
          default:
            dprop.field.value = dprop.default || "";
        }
      });
    }
    async __onSave() {
      return this.saveItem(false);
    }
    async __onSaveAndQuit() {
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
      console.log("[focusField] Focus dans le champ %i (%s)", indice, dproperty.propName, dproperty.field);
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

  // src/webviews/models/EntryForm.ts
  var allg = Constants.ENTRIES_GENRES;
  var genres = Object.keys(allg).map((key) => [key, allg[key]]);
  var EntryForm = class _EntryForm extends FormManager {
    formId = "entry-form";
    prefix = "entry";
    properties = [
      { propName: "entree", type: String, required: true, fieldType: "text", onChange: this.onChangeEntree.bind(this) },
      { propName: "id", type: String, required: true, fieldType: "text" },
      { propName: "genre", type: String, required: true, fieldType: "select", values: genres },
      { propName: "categorie_id", type: String, required: false, fieldType: "text" },
      { propName: "definition", type: String, required: false, fieldType: "textarea" }
    ];
    // Table des raccourcis 'one key' propre au formulaire
    tableKeys = {
      // <touche>: <fonction bindée>, par exemple
      // 'i': this.showInfo.bind(this)
    };
    static REG_SHORT_DEF = /\b(cf\.|voir|synonyme|contraire)\b/;
    static REGEX_APPELS_ENTRIES = new RegExp(`(?:${Object.keys(Constants.MARK_ENTRIES).join("|")})\\(([^)]+)\\)`, "g");
    static REG_OEUVRES = /\boeuvre\(([^)]+)\)/g;
    onChangeEntree() {
      const itemIsNew = this.getValueOf("id") === "";
      if (itemIsNew) {
        console.log("C'est un nouvel item, il faut calculer son ID d'apr\xE8s son entr\xE9e.");
      }
    }
    // À faire après l'édition d'une Entrée
    afterEdit() {
      const id = this.field("id").value;
      const isNewItem = id === "";
      if (isNewItem) {
        this.setIdLock(false);
      }
    }
    /**
     * Grand méthode de check de la validité de l'item. On ne l'envoie
     * en enregistrement que s'il est parfaitement conforme. 
     */
    async checkItem(item) {
      const isNew = item.isNew;
      const errors = [];
      this.diverseChecks(item, errors);
      const unknownOeuvres = await this.checkExistenceOeuvres(item);
      if (unknownOeuvres.length) {
        errors.push(`des \u0153uvres sont introuvables : ${unknownOeuvres.map((t) => `"${t}"`).join(", ")}`);
      }
      const unknownEx = await this.checkExistenceExemples(item);
      if (unknownEx.length) {
        errors.push(`des exemples sont introuvables: ${unknownEx.join(", ")}`);
      }
      if (errors.length) {
        console.error("Donn\xE9es invalides", errors);
        return errors.join(", ").toLowerCase();
      }
    }
    async checkExistenceOeuvres(item) {
      const checkerOeuvres = new ComplexRpc({
        call: this.searchUnknownOeuvresIn.bind(this, item.definition)
      });
      let resultat = await checkerOeuvres.run();
      const res = resultat;
      console.log("Retour apr\xE8s checkerOeuvres", resultat);
      return res.unknown;
    }
    diverseChecks(item, errors) {
      if (item.entree === "") {
        errors.push("L'entr\xE9e doit \xEAtre d\xE9finie");
      }
      if (item.changeset.has("entree")) {
        const newEntree = item.changeset.get("entree");
        console.log("L'entr\xE9e a chang\xE9 (%s/%s)", item.original.entree, newEntree);
        if (Entry.doesEntreeExist(newEntree)) {
          errors.push(`L'entr\xE9e "${newEntree}" existe d\xE9j\xE0\u2026`);
        }
      }
      if (item.id === "") {
        errors.push("L'identifiant doit absoluement \xEAtre d\xE9fini");
      } else if (item.changeset.has("id")) {
        if (Entry.doesIdExist(item.id)) {
          errors.push(`L'identifiant "${item.id}" existe d\xE9j\xE0. Je ne peux le r\xE9attribuer`);
        }
      }
      if (item.definition === "") {
        errors.push("La d\xE9finition du mot doit \xEAtre donn\xE9e");
      } else if (item.changeset.has("definition")) {
        if (item.definition.length < 50 && null === item.definition.match(_EntryForm.REG_SHORT_DEF)) {
          errors.push("La d\xE9finition est courte, sans justification\u2026");
        }
        const unknownEntries = this.searchUnknownEntriesIn(item.definition);
        if (unknownEntries.length > 0) {
          errors.push(`entr\xE9es inconnues dans la d\xE9fintion (${unknownEntries.join(", ")})`);
        }
      } else {
        console.log("La d\xE9finition n'a pas \xE9t\xE9 modifi\xE9e.");
      }
      if (item.genre === "") {
        errors.push("Le genre de l'entr\xE9e doit \xEAtre donn\xE9");
      } else if (item.changeset.has("genre") && Object.keys(Constants.ENTRIES_GENRES).includes(item.genre)) {
        errors.push(`bizarrement, le genre "${item.genre} est inconnu\u2026`);
      }
      if (item.categorie_id !== "" && item.changeset.has("categorie_id")) {
        const unknownCategorie = this.checkUnknownCategoriesIn(item.categorie_id);
        if (unknownCategorie.length) {
          errors.push(`des cat\xE9gories sont inconnues : ${unknownCategorie.join(", ")}`);
        }
      }
      return errors;
    }
    // Pour chercher les entrées mentionnées dans la définition
    searchUnknownEntriesIn(str) {
      const founds = [];
      const matches = str.matchAll(_EntryForm.REGEX_APPELS_ENTRIES);
      for (const match of matches) {
        const foo = match[1];
        let [entry, entryId] = foo.split("|");
        entryId = (entryId || entry).trim();
        if (Entry.doesIdExist(entryId)) {
          console.log("Id d'entr\xE9e existante", entryId);
        } else if (Entry.doesEntreeExist(entryId)) {
          console.log("Entr\xE9e existante (par son nom)", entryId);
        } else if (entryId.endsWith("s")) {
          const entryIdSing = entryId.substring(0, entryId.length - 1);
          if (Entry.doesEntreeExist(entryIdSing)) {
            console.log("Entr\xE9e existante (pas son nom singulier)", entryId);
          } else if (Entry.doesIdExist(entryIdSing)) {
            console.log("Id entr\xE9e existante (dans sa forme singuli\xE8re)", entryId);
          }
        } else {
          founds.push(entryId);
        }
      }
      return founds;
    }
    /**
     * Vérifie que les œuvres désignées dans les balises oeuvre(...) existent
     * bel et bien.
     *
     * Cette fonction s'intègre dans une requête Rpc complexe (ComplexRpc)
     * 
     * Pour ce faire, on a besoin de passer par l'extension car on n'a pas 
     * accès aux oeuvres depuis ici.
     * 
     * @param str Dans la phase 1, La définition, dans la phase 2, le json revenant du check
     * @param phase Pour savoir si on remonte de la vérifiation (phase 2)
     * @returns La liste des œuvres qui n'ont pas été trouvées
     */
    searchUnknownOeuvresIn(str, CRId) {
      const matches = str.matchAll(_EntryForm.REG_OEUVRES);
      const oeuvres = [];
      for (let match of matches) {
        oeuvres.push(match[1]);
      }
      console.log("Oeuvres \xE0 checker", oeuvres);
      RpcEntry.notify("check-oeuvres", { CRId, oeuvres });
    }
    /**
     * Fonction principale pour checker les exemples dans la définition
     * C'est elle qui initie la requête Rpc complexe. 
     */
    async checkExistenceExemples(item) {
      const comp = new ComplexRpc({
        call: this.searchUnknownExemplesIn.bind(this, item.definition)
      });
      const resultat = await comp.run();
      const res = resultat;
      return res.unknown;
    }
    /**
     * Fonction vérifiant l'existence des exemples
     * 
     * Elle s'intègre dans la requête Rpc complexe inaugurée par la
     * fonction checkExistenceExemples.
     * 
     * Rappel : les exemples, dans les définitions, sont définis par
     * EXEMPLES[<ID oeuvre>:<indice exemple>, <ID oeuvre>:<indice>, etc.]
     * Il peut y en avoir plusieurs par définition, comme pour la définition des genres.
     *  
     * @param str Le texte de la définition
     * @param CRId L'identifiant de la ComplexRpc qui gère toute la communication
     * 
     * @return Rien, c'est la méthode message en bout de chaine qui résolvera 
     * la requête Rpc complexe pour poursuivre.
     */
    searchUnknownExemplesIn(str, CRId) {
      let matches = str.matchAll(/EXEMPLES\[([^\]]+)\]/g);
      const exemples = [];
      for (var match of matches) {
        match[1].split(",").map((s) => s.trim()).forEach((paire) => {
          const [oeuvreId, exIndice] = paire.split(":");
          exemples.push([oeuvreId, exIndice]);
        });
      }
      RpcEntry.notify("check-exemples", { CRId, exemples });
    }
    // @return la liste des catégories inconnues
    checkUnknownCategoriesIn(str) {
      const cats = str.split(",").map((s) => s.trim());
      return cats.filter((cat) => false === Entry.doesIdExist(cat));
    }
    /**
     * ENREGISTREMENT DE L'ENTRÉE
     * -------------------------- 
     * Procédure complexe (ComplexRpc)
     */
    async onSave(item) {
      const itemSaver = new ComplexRpc({
        call: Entry.saveItem.bind(Entry, item)
      });
      const res = await itemSaver.run();
      console.log("res dans onSave", res);
      if (res.ok) {
        console.log("Apr\xE8s l'enregistrement de l'item, je dois apprendre \xE0 updater l'item (plut\xF4t en m\xE9thode g\xE9n\xE9rale ?)");
        Entry.panel.flash("Item enregistr\xE9 avec succ\xE8s.", "notice");
      } else {
        console.error("ERREURS LORS DE L'ENREGISTREMENT DE L'ITEM", res.errors);
        Entry.panel.flash("Erreur (enregistrement de l\u2019entr\xE9e (voir la console", "error");
      }
      return true;
    }
    /**
     * Observation propre du formulaire des Entrées
     * 
     */
    observeForm() {
      this.btnLockId.addEventListener("click", this.onLockId.bind(this));
    }
    get btnLockId() {
      return this.obj.querySelector("button.btn-lock-id");
    }
    onLockId() {
      this.toggleIdLock();
    }
  };

  // src/webviews/models/Entry.ts
  var Entry = class _Entry extends ClientItem {
    type = "entry";
    static minName = "entry";
    static klass = _Entry;
    static currentItem;
    static setAccessTable(items) {
      this._accessTable = new AccessTable(_Entry, items);
    }
    // retourn le premier item visible après l'item +item+
    static getFirstVisibleAfter(refItem) {
      const aT = this.accessTable;
      return aT.findAfter(
        (item) => {
          return aT.getAccKeyById(item.data.id).visible === true;
        },
        refItem.data.id
      );
    }
    /*
        === MÉTHODES DE CHECK ===
     */
    // @return true si l'entrée +entree+ existe déjà
    static doesEntreeExist(entree) {
      entree = entree.toLowerCase();
      return this.accessTable.find((item) => item.data.entree.toLowerCase() === entree) !== void 0;
    }
    // @return true si l'identifiant +id+ existe déjà
    static doesIdExist(id) {
      if (this.accessTable.existsById(id)) {
        return true;
      }
      return false;
    }
    /**
     * Méthode pour enregistrer l'item dans la table
     * 
     * 
     */
    static saveItem(item, compRpcId) {
      RpcEntry.notify("save-item", { CRId: compRpcId, item });
    }
    static onSavedItem(params) {
      console.log("[CLIENT ENTRY] Retour dans le panneau Entry avec le r\xE9sultat de l'enregistrement", params);
      ComplexRpc.resolveRequest(params.CRId, params);
    }
  };
  var EntryPanelClass = class extends PanelClient {
    get accessTable() {
      return Entry.accessTable;
    }
    /**
     * Méthode de filtrage propre aux Entrées (Entry)
     * 
     * @param searched Texte à trouver
     * @returns Liste des items trouvés
     */
    // Méthode de filtrage des entrées
    // Retourne celles qui commencent par +searched+
    searchMatchingItems(searched) {
      const prefixLower = StringNormalizer.toLower(searched);
      const prefixRa = StringNormalizer.rationalize(searched);
      return this.filter(Entry.accessTable, (entry) => {
        entry = entry;
        return entry.data.entree_min.startsWith(prefixLower) || entry.data.entree_min_ra.startsWith(prefixRa);
      });
    }
    // initKeyManager() {
    //   this._keyManager = new VimLikeManager(document.body, this, Entry);
    // }
  };
  var EntryPanel = new EntryPanelClass({
    minName: "entry",
    titName: "Entries",
    klass: Entry,
    form: new EntryForm()
  });
  EntryPanel.form.setPanel(EntryPanel);
  Entry.panel = EntryPanel;
  var RpcEntry = createRpcClient();
  RpcEntry.on("start", () => {
    setTimeout(EntryPanel.activateContextualHelp.bind(EntryPanel), 1e3);
  });
  RpcEntry.on("activate", () => {
    if (EntryPanel.isActif) {
      return;
    }
    console.log("[CLIENT ENTRY] Je dois marquer le panneau Entry actif");
    EntryPanel.activate();
  });
  RpcEntry.on("desactivate", () => {
    if (EntryPanel.isInactif) {
      return;
    }
    console.log("[CLIENT ENTRY] Je dois marquer le panneau Entry comme inactif.");
    EntryPanel.desactivate();
  });
  RpcEntry.on("populate", (params) => {
    const items = Entry.deserializeItems(params.data, Entry);
    EntryPanel.populate(Entry.accessTable);
    EntryPanel.initKeyManager();
  });
  RpcEntry.on("display-entry", (params) => {
    console.log("[CLIENT] Je dois afficher l'entr\xE9e '%s'", params.entry_id);
    EntryPanel.scrollToAndSelect(params.entry_id);
  });
  RpcEntry.on("check-oeuvres-resultat", (params) => {
    console.log("[CLIENT ENTRY] Je re\xE7ois le r\xE9sultat du check des oeuvres", params);
    ComplexRpc.resolveRequest(params.CRId, params.resultat);
  });
  RpcEntry.on("check-exemples-resultat", (params) => {
    console.log("[CLIENT ENTRY] R\xE9ception du r\xE9sultat du check des exemples : ", params);
    ComplexRpc.resolveRequest(params.CRId, params.resultat);
  });
  RpcEntry.on("after-saved-item", (params) => {
    console.log("[CLIENT Entry] R\xE9ception du after-saved-item", params);
    Entry.onSavedItem(params);
  });
  window.Entry = Entry;
})();
//# sourceMappingURL=entries-bundle.js.map
