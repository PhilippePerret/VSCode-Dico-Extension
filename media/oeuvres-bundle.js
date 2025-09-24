"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/webviews/services/App.ts
  var App;
  var init_App = __esm({
    "src/webviews/services/App.ts"() {
      "use strict";
      App = class _App {
        /**
         * Les méthodes suivantes peuvent s'appeler en tapant simplement leur
         * nom en console (bas des panneaux — 'c' pour rejoindre la console)
         */
        static async openSupport() {
          console.log("-> openSupport");
          _App.rpc.notify("open-support-folder");
          return "Ouverture du dossier Support";
        }
        static async exportAllData() {
          console.log("-> exportAllData");
          _App.rpc.notify("export-all-data");
          return "Exportation des donn\xE9es demand\xE9e.";
        }
        static get rpc() {
          return window.RpcEntry;
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
          console.log("Code \xE0 \xE9valuer dans App.tryEval", code);
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
    }
  });

  // src/webviews/ConsoleManager.ts
  var ConsoleManager_exports = {};
  __export(ConsoleManager_exports, {
    ConsoleManager: () => ConsoleManager
  });
  var ConsoleManager;
  var init_ConsoleManager = __esm({
    "src/webviews/ConsoleManager.ts"() {
      "use strict";
      init_App();
      ConsoleManager = class {
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
    }
  });

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

  // src/webviews/services/SelectionManager.ts
  var DEBUGIT = false;
  var SelectionManager = class {
    constructor(accessTable) {
      this.accessTable = accessTable;
      this.panel = accessTable.panel;
    }
    // La panneau associé au manager de sélection
    panel;
    current = void 0;
    getCurrent() {
      return this.current;
    }
    icursor = 0;
    historique = [];
    /**
     * @api
     * 
     * Sélection du prochain item (ou le premier)
     * 
     */
    selectNextVisibleItem() {
      let nextId = void 0;
      if (this.current) {
        nextId = this.accessTable.getNextVisible(this.current).id;
      }
      nextId = nextId || this.accessTable.getFirstVisible().id;
      this.debugit("Affectation de l\u2019item", nextId);
      this.setAsCurrentSelected(nextId);
      this.add(nextId);
    }
    /**
     * @papi
     * 
     * Sélection de l'item visible précédent.
     * 
     */
    selectPreviousVisibleItem() {
      let prevId = void 0;
      if (this.current) {
        prevId = this.accessTable.getPrevVisible(this.current).id;
      }
      prevId = prevId || this.accessTable.getFirstVisible().id;
      this.setAsCurrentSelected(prevId);
      this.add(prevId);
    }
    /**
     * @api
     * 
     * Méthode pour déselectionner la sélection courante.
     * 
     * Elle doit être publique car elle sert par exemple en cas de
     * filtrage de la liste.
     * 
     */
    deselectCurrent() {
      this.current && this.accessTable.setSelectState(this.current, false);
      this.current = void 0;
    }
    /**
     * @api
     * 
     * (Re)sélectionne l'item précédent.
     * 
     * Le "re" de "reselectionne" n'est là que pour indiquer qu'on fait
     * cette opération est par une sélection "classique". Elle est
     * utilisée en cas de filtrage de liste, quand l'itemp qui été sé-
     * lectionné et encore visible. Mais this.current a été mis à rien
     * au début du filtrage.
     * 
     * Note : on ne l'ajoute pas à l'historique puisqu'il s'y trouve 
     * déjà.
     */
    reselectItem(itemId) {
      this.setAsCurrentSelected(itemId);
    }
    /**
     * @api Par exemple sélection demandée depuis un autre panneau
     * 
     * @param itemId Identifiant de l'item à sélectionner
     */
    selectItem(itemId) {
      this.setAsCurrentSelected(itemId);
      this.add(itemId);
    }
    /**
      * Pour revenir à l'item précédent
      */
    historyBack() {
      this.debugit("back");
      this.ensurePrevCursor();
      this.setAsCurrentSelected(this.historique[this.icursor]);
    }
    /**
     * Pour passer à l'élément suivant
     */
    historyNext() {
      this.debugit("next");
      this.ensureNextCursor();
      this.setAsCurrentSelected(this.historique[this.icursor]);
    }
    /**
     * Pour retirer l'item courant de l'historique des sélections
     */
    removeCurrentFromHistory() {
      if (this.size === 1) {
        this.panel.flash("On ne peut pas retirer le dernier item d\u2019historique s\xE9lectionn\xE9.", "warn");
      } else {
        this.historique.splice(this.icursor);
        this.historyBack();
      }
    }
    /**
     * Méthode qui s'occupe de mettre l'élément +itemId+ en item 
     * courant en s'assurant de sélectionner l'item qui serait
     * actuellement sélectionné.
     * 
     * @param itemId Identifiant de l'élément à mettre en courant
     */
    setAsCurrentSelected(itemId) {
      this.current && this.deselectCurrent();
      this.current = String(itemId);
      this.select();
      this.panel.scrollTo(this.current);
    }
    select() {
      this.current && this.accessTable.setSelectState(this.current, true);
    }
    add(itemId) {
      this.debugit("add");
      this.historique.push(itemId);
      this.icursor = this.lastIndex;
    }
    ensurePrevCursor() {
      this.icursor--;
      if (this.icursor < 0) {
        this.icursor = this.lastIndex;
      }
    }
    ensureNextCursor() {
      this.icursor++;
      if (this.icursor > this.lastIndex) {
        this.icursor = 0;
      }
    }
    get lastIndex() {
      return this.size - 1;
    }
    get size() {
      return this.historique.length;
    }
    // Pour débugger la classe
    debugit(where, id = void 0) {
      if (!DEBUGIT) {
        return;
      }
      console.log(`
      [${where}]
      icursor = %i
      current = '%s'
      id fourni = '%s'
      `, this.icursor, this.current ? `'${this.current}'` : "undefined", id, this.historique);
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
    static get(keyHelp) {
      switch (keyHelp) {
        // FENÊTRE DE DÉMARRAGE
        case "start":
          return `
      ## D\xE9marrage de l'extension

      Pour commencer, activer le premier panneau (entr\xE9es) avec \u23181.

      \xC0 tout moment, vous pouvez obtenir de l'aide contextuelle en tapant "?" (donc "\u21E7,").
      
      Les raccourcis de base, utilisable dans les trois panneaux, sont les suivants :

      ${this.buildShortcutsTable([
            { s: "s", m: "NORMAL", d: "Pour se placer dans le champ de filtre et filtrer la liste." },
            { s: "n", m: "NORMAL", d: "Pour cr\xE9er un nouvel \xE9l\xE9ment." },
            { s: "j", m: "NORMAL", d: "Pour s\xE9lectionner l\u2019\xE9l\xE9ment suivant ou le premier." },
            { s: "k", m: "NORMAL", d: "Pour remonter \xE0 l\u2019\xE9l\xE9ment pr\xE9c\xE9dent" },
            { s: "b", m: "NORMAL", d: "(comme \xAB\xA0back\xA0\xBB) Pour s\xE9lectionner l\u2019\xE9l\xE9ment pr\xE9c\xE9demment s\xE9lectionn\xE9" },
            { s: "f", m: "NORMAL", d: "Pour repasser \xE0 l\u2019\xE9l\xE9ment suivant de l\u2019historique des s\xE9lections" },
            { s: "r", m: "NORMAL", d: "Pour retirer la s\xE9lection de l\u2019historique des s\xE9lections" },
            { s: "e", m: "NORMAL", d: "Pour mettre en \xE9dition l\u2019\xE9l\xE9ment s\xE9lectionn\xE9." },
            { s: "m", m: "NORMAL", d: "(comme \xAB mise en forme\xA0\xBB) pour mettre en forme le texte." },
            { s: "Tab", m: "NORMAL", d: "pour passer de lien en lien (d\xE9finition et exemple)" },
            { s: "\u21E7Tab", m: "NORMAL", d: "Passer de lien en lien en remontant" },
            { s: "g", m: "NORMAL", d: "Rejoindre la cible du lien" },
            { s: "c", m: "NORMAL", d: "Pour se placer dans la console et jouer une commande." },
            { s: "C (\u21E7c)", m: "NORMAL", d: "Choisir l\u2019entr\xE9e s\xE9lectionn\xE9e pour le nouvel exemple d\xE9j\xE0 en \xE9dition." },
            { s: "E (\u21E7e)", m: "NORMAL", d: "Cr\xE9er un nouvel exemple pour l\u2019entr\xE9e." }
          ])}
      
      \xC0 tout moment, taper **?** pour afficher l'aide contextuelle.
      
      ## Commandes

      ${this.buildCommandsTable([
            { c: "openSupport", d: "\u2026 pour ouvrir le dossier support dans le Finder, qui contient la base et tous les backups." },
            { c: "exportAllData", d: "\u2026 pour faire un export des donn\xE9es dans quatre formats, JSON, YAML, CSV et Simple Text." }
          ])}

      ## \xC9dition de la d\xE9finition

      ## Autocompl\xE9tion

      ${this.buildShortcutsTable([
            { s: "tt\u21E5", m: "EDIT", d: "Ajouter un mot technique index\xE9" },
            { s: "->(\u21E5", m: "EDIT", d: "Ajouter un mot technique avec num\xE9ro de page" },
            { s: "ttp\u21E5", m: "EDIT", d: "Ajouter la page d\u2019un mot technique" }
          ])}
      `;
        // CRÉATION D'UN ÉLÉMENT QUELCONQUE
        case "create-element":
          return `
      ## Cr\xE9ation d'un \xE9l\xE9ment
      
      Vous pouvez vous d\xE9placer de champ en champ avec les touches 
      <shortcut>a</shortcut>, <shortcut>b</shortcut>, etc. ou la touche 
      tabulation.`;
        // CRÉATION D'UNE OEUVRE
        case "create-oeuvre":
          return `
      ## Cr\xE9ation d'une \u0153uvre

      Jouer la touche <shortcut>n</shortcut> pour cr\xE9er le nouvel \xE9l\xE9ment.

      Une fois le titre rentr\xE9, gr\xE2ce \xE0 la touche <shortcut>i</shortcut>, vous 
      pouvez obtenir les infos qu'on peut trouver sur le net. En pr\xE9cisant l'ann\xE9e 
      (approximative), la langue et/ou le pays, vous pouvez \xEAtre presque certain 
      de trouver l'\u0153uvre du premier coup.

      L'ann\xE9e (approximative \xE0 10 ans pr\xE8s) se met dans le champs d\xE9die, la langue 
      et le pays peuvent s'indiquer dans le champs 'notes' sous la forme JSON. Par 
      exemple <code>{"langue": "en", "pays": "us"}</code>.

      Ensuite, TMDB renvoie la liste de toutes les \u0153uvres correspondantes qu'il a 
      trouv\xE9 et les passe en revue pour choisir laquelle garder. \xC7a se fait en deux 
      temps\xA0:

      - rel\xE8ve de toutes les \u0153uvres, d'un coup, avec infos minimales,
      - on fait un tri par rapport \xE0 celles-ci,
      - TMDB rel\xE8ve les informations compl\xE8tes (principalement les cr\xE9dits),
      - On choisit celle qui correspond vraiment.
      `;
        // ÉDITION D'UN ÉLÉMENT
        case "edit-element":
          return `
      ## \xC9dition d'un \xE9l\xE9ment
      
      Vous pouvez aller de champ en champ avec les touches etc.`;
        // ÉDITION D'UNE OEUVRE
        case "edit-oeuvre":
          return `
      ## \xC9dition d'une \u0153uvre

      D\xE9placez-vous de champ en champ avec la touche tabulation ou en jouant 
      les lettres en regard des champs.
      `;
      }
    }
    /**
     * Pour construire une table de commande 
     * 
     * @param shortcuts Définition des commandes
     * @returns  La table HTML
     */
    static buildCommandsTable(commands) {
      const rows = [];
      rows.push("<tr><td>Commande</td><td>Effet</td></tr>");
      commands.forEach((sc) => rows.push(`<tr><td>${sc.c}</td><td>${sc.d}</td></tr>`));
      return '<table class="commands">' + rows.join("") + "</table>";
    }
    /**
     * Pour construire une table de raccourcis-clavier
     * 
     * @param shortcuts Définition des raccourcis
     * @returns  La table HTML
     */
    static buildShortcutsTable(shortcuts) {
      const rows = [];
      rows.push("<tr><td>Racc.</td><td>MODE</td><td>Effet</td></tr>");
      shortcuts.forEach((sc) => rows.push(`<tr><td><shortcut>${sc.s}</shortcut></td><td>${sc.m}</td><td>${sc.d}</td></tr>`));
      return '<table class="shortcuts">' + rows.join("") + "</table>";
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
      let content = _Help.get(context);
      return [this.formate(content), kbb];
    }
    formate(str) {
      console.log("-> formate (formatage du texte d'aide", str);
      return str.trim().replace(/^\s+/gm, "").replace(/>\n+/g, ">").replace(/\n+<\//g, "</").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/^### (.+)$/mg, "<h3>$1</h3>").replace(/^## (.+)$/mg, "<h2>$1</h2>").replace(/^# (.+)$/mg, "<h1>$1</h1>").split("\n\n").map((s) => {
        if (s.startsWith("<")) {
          return s;
        } else {
          return `<p>${s}</p>`;
        }
      }).join("");
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
      this.loadConsoleManager();
      this.form = this.panel.form;
      this.root.addEventListener("keydown", this.universelKeyboardCapture.bind(this), true);
      this.root.addEventListener("keydown", this.onKeyDown.bind(this));
      this._keylistener = this.onKeyDownModeNull.bind(this);
      this.searchInput = this.root.querySelector("input#search-input");
      this.consoleInput = this.root.querySelector("input#panel-console");
      this.searchInput.addEventListener("focus", this.onFocusEditField.bind(this, this.searchInput));
      this.searchInput.addEventListener("blur", this.onBlurEditField.bind(this, this.searchInput));
      this.consoleInput.addEventListener("focus", this.onFocusConsole.bind(this, this.consoleInput));
      this.consoleInput.addEventListener("blur", this.onBlurConsole.bind(this, this.consoleInput));
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
        case "console":
          this._keylistener = this.onKeyDownModeConsole.bind(this);
          break;
        case "edit":
          this._keylistener = this.onKeyDownModeEdit.bind(this);
          break;
        case "normal":
          this._keylistener = this.onKeyDownModeNormal.bind(this);
          break;
        case "null":
          this._keylistener = this.onKeyDownModeNull.bind(this);
          break;
        case "form":
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
    onFocusConsole(field, ev) {
      this.setMode("console");
    }
    onBlurConsole(field, ev) {
      this.setMode("normal");
    }
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
    get accessTable() {
      return this._accesstable || (this._accesstable = this.klass.accessTable);
    }
    get selectionManager() {
      return this._selmanager || (this._selmanager = this.accessTable.selectionManager);
    }
    _accesstable;
    _selmanager;
    onKeyDownModeNormal(ev) {
      if (ev.metaKey) {
        return this.onKeyDownWithMeta(ev);
      }
      stopEvent(ev);
      switch (ev.key) {
        case "s":
          this.searchInput.focus();
          break;
        case "j":
          this.selectionManager.selectNextVisibleItem();
          break;
        case "k":
          this.selectionManager.selectPreviousVisibleItem();
          break;
        case "b":
          this.selectionManager.historyBack();
          break;
        case "f":
          this.selectionManager.historyNext();
          break;
        case "r":
          this.selectionManager.removeCurrentFromHistory();
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
        case "Tab":
          this.panel.nextLinkSelection(ev.shiftKey);
          break;
        case "g":
          this.panel.activeLinkSelection();
          break;
        default:
          if (this.panel.tableKeys[ev.key]) {
            this.panel.tableKeys[ev.key].fn.call(null);
          } else {
            console.log("Pour le moment, je ne fais rien de '%s'", ev.key);
          }
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
          switch (this.threelast.join("")) {
            case "dim":
              ev.stopPropagation();
              return this.klass.autocompleteDim(ev);
          }
          switch (this.twolast.join("")) {
            case ">(":
              ev.stopPropagation();
              return this.klass.autoCompleteBaliseTerm("->", ev);
            case "tp":
              ev.stopPropagation();
              return this.klass.autoCompleteBaliseTerm("ttp", ev);
            case "tt":
              ev.stopPropagation();
              return this.klass.autoCompleteBaliseTerm("tt", ev);
          }
          ev.target.blur();
          return stopEvent(ev);
        default:
          console.log("Touche non trait\xE9e : %s", ev.key);
      }
      this.threelast.shift();
      this.threelast.push(ev.key);
      this.twolast.shift();
      this.twolast.push(ev.key);
      console.log("Deux derni\xE8res lettres = '%s'", this.twolast.join(""));
      return true;
    }
    twolast = ["", ""];
    threelast = ["", "", ""];
    // Mode clavier pour la console
    consoleManager;
    // Instance ConsoleManager;
    onKeyDownModeConsole(ev) {
      switch (ev.key) {
        case "Enter":
          this.consoleManager.runCode();
          break;
        case "ArrowDown":
          this.consoleManager.forwardHistory();
          break;
        case "ArrowUp":
          this.consoleManager.backHistory();
          break;
        default:
          console.log("Console. Lettre %s", ev.key);
      }
    }
    async loadConsoleManager() {
      const module = await Promise.resolve().then(() => (init_ConsoleManager(), ConsoleManager_exports));
      this.consoleManager = new module.ConsoleManager(this.panel);
    }
    // Mode clavier pour le formulaire
    onKeyDownModeForm(ev) {
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
            this.form.tableKeys[ev.key].fn.call(null);
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
    tableKeys = {};
    // shortcuts propres aux panneaux
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
      if (this.form.isActive()) {
        this.form.__onFocusOnForm(void 0);
      }
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
    getSelection() {
      return this.accessTable.getSelection();
    }
    /**
     * Permet de sélectionner avec les tabulations les liens se trouvant 
     * dans le texte (définition pour les entrées et content pour les
     * exemples). Pour permettre de faire Tab+Tab+Tab+Entrée pour 
     * rejoindre un lien
     * 
     * On tient à jour une table qui permet de conserver l'indice du 
     * lien dernièrement sélectionné.
     * 
     * @param withMaj Pour savoir si la touche est pressée (pour remonter les liens)
     * 
     */
    nextLinkSelection(withMaj) {
      const itemId = this.getSelection();
      if (itemId === void 0) {
        return;
      }
      const obj = this.accessTable.getObj(itemId);
      const ak = this.accessTable.getAccKey(itemId);
      const links = obj.querySelectorAll("a");
      if (links.length === 0) {
        return this.flash("Aucun lien dans cet \xE9l\xE9ment\u2026", "notice");
      }
      let nextSelLink = ak.lastSelectedLink || 0;
      nextSelLink += withMaj ? -1 : 1;
      if (nextSelLink === -1) {
        nextSelLink = links.length;
      } else if (nextSelLink < 0) {
        nextSelLink = links.length;
      } else if (nextSelLink > links.length) {
        nextSelLink = 1;
      }
      if (ak.lastSelectedLink) {
        links[ak.lastSelectedLink - 1].classList.remove("current");
      }
      const link = links[nextSelLink - 1];
      link.classList.add("current");
      ak.lastSelectedLink = nextSelLink;
      this.flash('Presser "g" (comme "go") pour rejoindre le lien s\xE9lectionn\xE9.', "notice");
    }
    /**
     * Pour activer le lien sélectionné (simuler donc un clique de souris)
     * (note : ça se fait avec la touche 'g' comme 'go')
     */
    activeLinkSelection() {
      const itemId = this.getSelection();
      if (itemId === void 0) {
        return this.flash("Aucune s\xE9lection => aucun lien \xE0 activer\u2026", "notice");
      }
      const obj = this.accessTable.getObj(itemId);
      const ak = this.accessTable.getAccKey(itemId);
      const links = obj.querySelectorAll("a");
      if (links.length === 0) {
        return this.flash("Aucun lien dans cet \xE9l\xE9ment\u2026", "notice");
      }
      if (!ak.lastSelectedLink) {
        return this.flash("Aucun lien n\u2019a \xE9t\xE9 s\xE9lectionn\xE9\u2026", "warn");
      }
      const selLink = ak.lastSelectedLink;
      const alink = links[selLink - 1];
      this.onClickALink(alink);
    }
    // Reçoit le click de souris sur un lien dans le texte ou peut être directement 
    // appelée pour simuler ce clic.
    onClickALink(alink, ev = void 0) {
      console.log("Link cliqu\xE9 depuis texte format\xE9", ev);
      const method = String(alink.dataset.method);
      const id = String(alink.dataset.id);
      this[method](id);
      ev && stopEvent(ev);
    }
    /**
     * 
     * Méthode sélectionnant un élément. L'opération est complexe car
     * elle met non seulement en forme l'élément dans le DOM, mais elle
     * conserve en plus l'état de l'élément dans l'accessTable et gère
     * la sélection (sélection qui le moment est simple).
     */
    select(itemId) {
      this.accessTable.selectionManager.selectItem(itemId);
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
      if ("string" === typeof obj) {
        obj = this._klass.getObj(obj);
      }
      obj.scrollIntoView({ behavior: "auto", block: "center" });
    }
    // Pour créer le nouvel élément 
    insertInDom(item, before) {
      const clone = this.cloneItemTemplate();
      const mainElement = clone.querySelector("." + this.minName);
      if (mainElement) {
        mainElement.setAttribute("data-id", item.id);
      }
      if (before) {
        let beforeObj = this.accessTable.getObj(before.id);
        if (this.minName === "exemple") {
          beforeObj = beforeObj.previousSibling;
        }
        this.container.insertBefore(clone, beforeObj);
      } else {
        this.container.appendChild(clone);
      }
      this.updateInDom(item);
    }
    // Pour actualiser les valeurs dans le DOM
    updateInDom(item) {
      const obj = this.accessTable.getObj(item.id);
      if (!obj) {
        this.flash(`Impossible de trouver l'objet DOM de ${item.id}\u2026 Je ne peux pas actualiser l'affichage.`, "error");
        return false;
      }
      Object.keys(item.dbData).forEach((prop) => {
        let value = item.dbData[prop];
        this.setPropValue(obj, item, prop, value);
      });
      Object.keys(item.cachedData).forEach((prop) => {
        let value = item.cachedData[prop];
        this.setPropValue(obj, item, prop, value);
      });
      return true;
    }
    // Pour peupler le panneau
    populate(accessTable) {
      const container = this.container;
      container.innerHTML = "";
      accessTable.each((item) => {
        this.insertInDom(item, void 0);
      });
      this.afterDisplayItems(accessTable);
      this.observePanel();
    }
    setPropValue(obj, item, prop, value) {
      value = this.formateProp(item, prop, value);
      obj.querySelectorAll(`[data-prop="${prop}"]`).forEach((element) => {
        if (value.startsWith("<")) {
          element.innerHTML = value;
        } else {
          element.textContent = value;
        }
      });
    }
    // ========== PRIVATE METHODS ==============
    // Pour conserver les sélections précédentes et y revenir
    previousSelections = [];
    // Pour la propriété public keyManager
    initKeyManager() {
      this._keyManager = new VimLikeManager(document.body, this, this._klass);
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
    }
    // Méthode générique de filtrage des items du panneau
    /**
     *  Méthode de filtrage des éléments affichés.
     */
    filterItems(ev) {
      const selectedItemId = this.getSelection();
      this.accessTable.selectionManager.deselectCurrent();
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
      if (selectedItemId) {
        const selectedAK = this.accessTable.getAccKey(selectedItemId);
        if (selectedAK.visible === true) {
          this.accessTable.selectionManager.reselectItem(selectedItemId);
        }
      }
    }
    /**
     *  Méthode fonctionnelle pour retourner une liste d'items filtrés
     * 
     * Note : Cette fonction n'a rien à voir avec la méthode qui filtre
     * les items à l'affichage (cf. ci-dessus).
     */
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
    // type ConsoleManager
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
  };

  // src/webviews/services/AccessTable.ts
  var AccessTable = class {
    constructor(panel, items) {
      this.panel = panel;
      this.populateInTable(items);
    }
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
    getSelection() {
      return this.selectionManager.getCurrent();
    }
    get selectionManager() {
      return this._selmanager || (this._selmanager = new SelectionManager(this));
    }
    _selmanager;
    // après un ajout ou une suppression, par exemple
    reset() {
      this._size = null;
    }
    /**
     * La fonction gère l'état DOM de l'élément sélectionné ou déselectionné,
     * à savoir :
     * - la classe 'selected' de son objet DOM
     * - la propriété @selected de son accKey
     * 
     * @param id Identifiant de l'élément (AnyItemType)
     * @param state Son nouvel état (true = sélectionné, false = désélectionné)
     */
    setSelectState(id, state) {
      const itemAK = this.getAccKey(id);
      const obj = itemAK.obj || this.getObj(id);
      itemAK.selected = state;
      obj.classList[state ? "add" : "remove"]("selected");
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
    // Retourne le premier élément visible
    getFirstVisible() {
      return this.find((item) => this.getAccKey(item.id).visible === true);
    }
    getNextVisible(refId) {
      let ak;
      while (ak = this.getNextAccKey(refId)) {
        if (ak.visible) {
          return this.get(ak.id);
        }
      }
    }
    getPrevVisible(refId) {
      let ak;
      while (ak = this.getPrevAccKey(refId)) {
        if (ak.visible) {
          return this.get(ak.id);
        }
      }
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
     * @returns [<item>, <next item>] Pour soit updater les données pour une
     * update soit insérer le nouvel élément dans le DOM pour une création
     * Note : c'est le panneau qui s'en charge.
     */
    upsert(item) {
      const checkedId = item.id;
      let cachedItem;
      if (this.exists(checkedId)) {
        const accKey = this.getAccKey(checkedId);
        this.arrayItems[accKey.index] = item;
        return [item, void 0];
      } else {
        return this.createNewAccedableItem(item);
      }
    }
    createNewAccedableItem(newItem) {
      let nextItem = this.find((compItem) => {
        return compItem.id > newItem.id;
      });
      let nextItemId, prevItemId, prevItem;
      let nextAccKey;
      if (nextItem) {
        nextItemId = nextItem.id;
        nextAccKey = this.getAccKey(nextItemId);
        const prevAccKey = this.getAccKey(nextAccKey.prev);
        prevItemId = nextAccKey.prev;
        if (prevItemId) {
          Object.assign(prevAccKey, { next: newItem.id });
          Object.assign(nextAccKey, { prev: newItem.id });
        }
      }
      const arrayIndex = this.arrayItems.length;
      const newAccKey = this.addInTable(newItem, arrayIndex, nextItemId, prevItemId);
      return [newItem, nextItem];
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
        const nextItemId = items[i + 1]?.id || void 0;
        const prevItemId = items[i - 1]?.id || void 0;
        this.addInTable(item, i, nextItemId, prevItemId);
      }
    }
    // Insertion séparée pour pouvoir ajouter en cours de travail
    addInTable(item, arrayIndex, nextItemId, prevItemId) {
      const chained = {
        type: "accedable-item",
        id: item.id,
        obj: void 0,
        index: arrayIndex,
        next: nextItemId,
        prev: prevItemId,
        visible: true,
        display: "block",
        selected: false,
        modified: false
      };
      this.keysMap.set(item.id, chained);
      this.arrayItems.push(item);
      return chained;
    }
    DOMElementOf(id) {
      return document.querySelector(`main#items > div[data-id="${id}"]`);
    }
    /**
     * 
     * 
     * ========== FONCTIONS SPÉCIALISÉES ==========
     * 
     * 
     * 
     */
    get wordset() {
      return this._wordset || (this._wordset = this.getListMotsForAutocomplete());
    }
    _wordset;
    /**
     * @api
     * 
     * Méthode filtrage des mots, pour l'autocompletion
     * 
     * @param text Le texte recherché dans les entrées
     */
    filterWithText(text) {
      text = StringNormalizer.rationalize(text);
      return this.wordset.filter((item) => item.min.startsWith(text));
    }
    /**
     * Pour l'autocomplétion dans le champ définition (et peut-être
     * exemple, mais plus compliqué) on a besoin de la liste des mots
     * préparées
     * 
     */
    getListMotsForAutocomplete() {
      if (this.firstItem.cachedData.itemType !== "entry") {
        return [];
      }
      return this.map((item) => {
        return {
          key: item.id,
          value: item.dbData.entree,
          min: item.cachedData.entree_min_ra
        };
      });
    }
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
    // Fonction pour sauver (appelée quand on sauve la donnée)
    async checkEditedItem() {
      return void 0;
    }
    panel;
    // le panneau contenant le formulaire
    saving = false;
    // Les propriétés à retirer des données à finalement sauver.
    // Note: les propriétés isNew et size sont déjà traitées
    /* surclasser (if any) */
    propsToRemove() {
      return [];
    }
    // Pour savoir si une édition est en cours
    // if this.form.isActive()
    isActive() {
      return !this.obj.classList.contains("hidden");
    }
    // Maintenant c'est celui-ci
    editedItem;
    getEditedItem() {
      return this.editedItem;
    }
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
      this.dispatchValues(item);
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
    /**
     * Méthode appelée après confirmation de la sauvegarde.
     * 
     * Elle finalise la donnée finale à enregistrer, notamment en 
     * retirant les propriétés non persistantes.
     */
    async onConfirmSave(andQuit) {
      console.log("Sauvegarde confirm\xE9e");
      const fakeItem = this.collectValues();
      const data2save = structuredClone(this.editedItem.original);
      Object.assign(data2save, this.editedItem.data2save);
      const removedProps = ["isNew", "size"];
      removedProps.push(...this.propsToRemove());
      console.log("Propri\xE9t\xE9s \xE0 remover", removedProps);
      const data2saveEpured = {};
      for (var k in data2save) {
        if (removedProps.includes(k)) {
          continue;
        }
        Object.assign(data2saveEpured, { [k]: data2save[k] });
      }
      console.log("Donn\xE9es FINALES \xE0 sauvegarder", structuredClone(data2saveEpured));
      await this.onSaveEditedItem(data2saveEpured);
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
    dispatchValues(item) {
      this.reset();
      const itemVals = item;
      this.properties.forEach((dprop) => {
        const prop = dprop.propName;
        const value = itemVals.dbData && (itemVals.dbData[prop] || itemVals.cachedData[prop]);
        if (value) {
          this.setValueOf(prop, String(value));
          if (dprop.locked) {
            dprop.field.disabled = true;
          }
        } else {
          console.log("La valeur de la propri\xE9t\xE9 %s n'est pas d\xE9finie dans ", prop, item);
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
      this.__observeForm();
      this.observeForm();
      this.checked = true;
    }
    inscritAideInFooter() {
      let aide = "<shortcut>q</shortcut><span>Renoncer</span><shortcut>s</shortcut><span>Enregistrer</span><shortcut>w</shortcut><span>Enregistrer et finir</span>";
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
      let curIndice = 0;
      let foundProp = void 0;
      this.properties.forEach((dprop) => {
        if (foundProp) {
          return;
        }
        if (dprop.no_shortcut) {
          return;
        }
        curIndice++;
        if (curIndice === indice) {
          foundProp = dprop;
        }
      });
      if (foundProp) {
        foundProp.field.focus();
      }
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
        if (container) {
          const label = container.querySelector("label");
          let shortcut;
          if (dproperty.no_shortcut) {
            shortcut = "";
          } else {
            shortcut = "<shortcut>" + lettres.pop() + "</shortcut>\xA0";
          }
          label.innerHTML = shortcut + label.innerHTML;
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

  // src/webviews/services/OeuvreFinder.ts
  var OeuvrePicker = class {
    // Le formulaire (transmis par la fenêtre principale)
    static form;
    /**
     * @api
     * 
     * Entrée pour pouvoir trouver les informations d'un oeuvre.
     * 
     * Fonctionnement
     * --------------
     *  - On relève tous les titres possibles (sur TMDB (films) ou WikiPedia)
     *  - S'ils sont plus de 5, on les filtres par les options
     *  - S'ils sont toujours plus de 5, on demande de faire un premier choix,
     *    avec les données simples.
     *  - On relève les informations complètes des oeuvres restantes
     *  - On les affiche en boucle pour pouvoir en choisir une.
     * 
     * @param titre Le titre à trouver
     * @param options Options pour faciliter la recherche
     * @param form Formulaire dans lequle mettre les résultats
     */
    static async findWithTitle(titre, options, form) {
      this.form = form;
      let oeuvres = [];
      if (options.type === void 0 || options.type === "film" || options.type === "s\xE9rie") {
        oeuvres = await TMDB.getSimpleInformations(titre, options);
      }
      if (oeuvres.length === 0) {
        oeuvres = await new WikiPedia("fr").findOeuvreFromTitle(titre, options);
        console.log("Oeuvres remont\xE9es pas wikip\xE9dia:", oeuvres);
      }
      if (oeuvres.length === 0) {
        this.flash("Aucune \u0153uvre trouv\xE9e avec ce titre\u2026", "error");
        return void 0;
      }
      if (oeuvres.length > 5) {
        const oeuvresFiltred = this.filterPerOptions(oeuvres, options);
        if (oeuvresFiltred.length > 0) {
          oeuvres = oeuvresFiltred;
        }
      }
      if (oeuvres.length === 1) {
        this.peupleForm(oeuvres[0]);
        return;
      }
      if (oeuvres.length > 5) {
        oeuvres = await this.chooseFiveMax(oeuvres);
        if (oeuvres.length === 1) {
          this.peupleForm(oeuvres[0]);
          return;
        }
      }
      if (options.type === void 0 || options.type === "film") {
        oeuvres = await TMDB.getFullInformations(oeuvres);
      }
      this.choose(oeuvres, 0);
    }
    /**
     * Reçoit une liste d'oeuvres et les affiche en boucle pour en 
     * choisir une.
     * 
     * @param oeuvres Les oeuvres parmi lesquelles choisir
     * @param ioeuvre Le "pointeur" de liste qui permet de savoir quelle oeuvre affichée
     */
    static choose(oeuvres, ioeuvre) {
      if (ioeuvre >= oeuvres.length - 1) {
        this.flash("On reprend\u2026", "notice");
        ioeuvre = 0;
      }
      const dataOeuvre = oeuvres[ioeuvre];
      ++ioeuvre;
      this.peupleForm(dataOeuvre);
      const map = /* @__PURE__ */ new Map();
      map.set("o", ["Prendre cette \u0153uvre", this.onChoose.bind(this)]);
      map.set("n", ["Suivante", this.choose.bind(this, oeuvres, ioeuvre)]);
      map.set("q", ["Finir", this.onCancel.bind(this)]);
      this.form.panel.flashAction("Est-ce cette \u0153uvre-l\xE0 ?", map);
    }
    /**
     * Permet de choisir, parmi un trop grand nombre d'œuvres, les cinq dont on va
     * relever toutes les informations pour pouvoir choisir la bonne.
     * 
     * @param oeuvres Les oeuvres initiales (20 maximum, avec TMDB)
     * @returns 
     */
    static async chooseFiveMax(oeuvres) {
      const result = {
        oeuvres,
        // Les oeuvres, mais qu'on shiftera
        kept: [],
        // Les oeuvres qui seront gardées
        choosed: [],
        // C'est une liste par commodité, mais il n'y aura que l'oeuvre choisie (if any) 
        max: 5
        // Le nombre maximum d'œuvres à conserver
      };
      return new Promise((resolve, reject) => {
        Object.assign(result, { resolve, reject });
        this.chooseMaxIn(result);
      });
    }
    static chooseMaxIn(result) {
      const oeuvre = result.oeuvres.shift();
      if (oeuvre && result.kept.length < result.max && result.choosed.length === 0) {
        this.peupleForm(oeuvre);
        const map = /* @__PURE__ */ new Map();
        map.set("o", ["Mettre de c\xF4t\xE9", () => {
          result.kept.push(oeuvre);
          this.chooseMaxIn(result);
        }]);
        map.set("n", ["Rejeter", () => this.chooseMaxIn(result)]);
        map.set("y", ["C\u2019est celle l\xE0\xA0!", () => {
          result.choosed = [oeuvre];
          result.kept = [];
          this.chooseMaxIn(result);
        }]);
        map.set("q", ["Finir", () => {
          result.max = 0;
          this.chooseMaxIn(result);
        }]);
        this.form.panel.flashAction("Que dois-je faire de cette \u0153uvre\xA0?", map);
      } else {
        result.resolve(result.kept.push(...result.choosed));
      }
    }
    // Juste pour avoir un point de sortie
    static onCancel(ev) {
      ev && stopEvent(ev);
    }
    static onChoose(ev) {
      ev && stopEvent(ev);
    }
    static flash(message, type) {
      this.form.panel.flash(message, type);
    }
    // Affiche les données de l'œuvre dans le formulaire, pour pouvoir 
    // les garder.
    static peupleForm(oeuvre) {
      console.log("Peupler le formulaire avec : ", oeuvre);
      this.form.setValueOf("titre_affiche", oeuvre.titre);
      this.form.setValueOf("titre_original", oeuvre.titre_original);
      oeuvre.auteurs && this.form.setValueOf("auteurs", oeuvre.auteurs);
      this.form.setValueOf("resume", oeuvre.resume);
      oeuvre.annee && this.form.setValueOf("annee", oeuvre.annee);
      const infos = {
        langue: oeuvre.langue || void 0,
        pays: oeuvre.pays || void 0,
        editeur: oeuvre.editeur || void 0,
        isbn: oeuvre.isbn || void 0,
        director: oeuvre.director || void 0
      };
      let infosStr = JSON.stringify(infos);
      if (infosStr === "{}") {
        infosStr = "";
      }
      this.form.setValueOf("notes", infosStr);
    }
    /**
     * @api
     * 
     * Méthode permettant de filtrer les oeuvres par années
     */
    static filterPerOptions(oeuvres, options) {
      oeuvres = this.filterPerYear(oeuvres, options);
      oeuvres = this.filterPerCountry(oeuvres, options);
      oeuvres = this.filterPerLanguage(oeuvres, options);
      return oeuvres;
    }
    // Filtrage par année
    static filterPerYear(oeuvres, options) {
      options.annee = Number(options.annee);
      var onlyOneMatches = false;
      oeuvres = oeuvres.map((result) => {
        if (onlyOneMatches) {
          return result;
        }
        if (options.annee && result.annee === options.annee) {
          onlyOneMatches = true;
        }
        return result;
      }).filter((result) => {
        if (onlyOneMatches) {
          return result.annee === options.annee;
        } else {
          return result.annee < options.annee + 5 && result.annee > options.annee - 5;
        }
      });
      return oeuvres;
    }
    static filterPerCountry(oeuvres, options) {
      if (void 0 === options.pays) {
        return oeuvres;
      }
      return oeuvres.filter((oeuvre) => oeuvre.pays === options.pays);
    }
    static filterPerLanguage(oeuvres, options) {
      if (void 0 === options.langue) {
        return oeuvres;
      }
      return oeuvres.filter((oeuvre) => oeuvre.langue === options.langue);
    }
  };
  var TMDB = class {
    /**
     * @api
     * Récupère et retourne les informations des films de titre +titre+
     * 
     * @param titre Le titre du film dont il faut avoir les informations. Plus tard, on verra si on peut avoir plusieurs films d'un coup.
     * @returns 
     */
    static async getSimpleInformations(titre, options) {
      let searchResults = await this.searchMovie(titre);
      searchResults = searchResults.map((result) => {
        return {
          id: result.id,
          annee: Number(result.release_date.substring(0, 4)),
          langue: result.original_language,
          titre_original: result.original_title,
          titre: result.title,
          resume: result.overview
        };
      });
      console.log("Premiers r\xE9sultats pr\xE9par\xE9s (%i)", searchResults.length, structuredClone(searchResults));
      return searchResults;
    }
    /**
     * Retourne les informations complètes pour les films +oeuvres+
     * 
     */
    static async getFullInformations(oeuvres) {
      return await Promise.all(oeuvres.map(async (oeuvre) => this.getAllInfos(oeuvre)));
    }
    // @return Toutes les informations sur le film +dOeuvre+
    static async getAllInfos(dOeuvre) {
      const movieId = dOeuvre.id;
      const details = await this.getMovieDetails(movieId);
      const credits = await this.getMovieCredits(movieId);
      return Object.assign(dOeuvre, {
        idmbId: details.imdb_id,
        pays: details.origin_country.join(", "),
        director: credits.director,
        auteurs: credits.auteurs
      });
    }
    static _TMDBSecrets;
    static get TMDB_READING_API_TOKEN() {
      return this._TMDBSecrets.reading_api_token;
    }
    static async getTMDBSecrets() {
      return RpcOeuvre.ask("tmdb-secrets").then((retour) => {
        this._TMDBSecrets = retour;
        return retour;
      }).catch((error) => {
        console.error("Une erreur est survenue", error);
      });
    }
    // Recherche par titre
    static async searchMovie(title) {
      if (void 0 === this._TMDBSecrets) {
        await this.getTMDBSecrets();
      }
      const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${this.TMDB_READING_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      return data.results;
    }
    // Informations détaillées d'un film par ID
    static async getMovieDetails(movieId) {
      const url = `https://api.themoviedb.org/3/movie/${movieId}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${this.TMDB_READING_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      });
      return await response.json();
    }
    // Informations techniques (cast & crew)
    static async getMovieCredits(movieId) {
      const url = `https://api.themoviedb.org/3/movie/${movieId}/credits`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${this.TMDB_READING_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      console.log("Information cr\xE9dits compl\xE8tes", data);
      const credits = {
        directors: [],
        writers: [],
        director: void 0,
        auteurs: void 0
      };
      data.crew.forEach((person) => {
        switch (person.job) {
          case "Director":
            credits.directors.push(person.name + MARK_UNKNOWN_GENRE);
            break;
          case "Writer":
          case "Co-Writer":
          case "Author":
          case "Adaptation":
          case "Screenplay":
          case "Story":
          case "Screenstory":
          case "Book":
          case "Novel":
            credits.writers.push(person.name + MARK_UNKNOWN_GENRE);
            break;
        }
      });
      const allauteurs = [];
      allauteurs.push(...credits.directors);
      allauteurs.push(...credits.writers);
      credits.director = credits.directors.join(", ");
      credits.auteurs = allauteurs.join(", ");
      return credits;
    }
  };
  var MARK_UNKNOWN_GENRE = "[HF?]";
  var WikiPedia = class {
    baseUrl;
    wikiApiUrl;
    constructor(lang = "fr") {
      this.baseUrl = "https://fr.wikipedia.org/api/rest_v1/page/summary/";
      this.wikiApiUrl = `https://${lang}.wikipedia.org/w/api.php`;
    }
    /**
     * @api
     * 
     * Trouve sur Wikipédia toutes les oeuvres correspondant au titre +titre+ et
     * en reetourne les informations dans un format standard (OeuvreType).
     * 
     * @param titre Le titre donné
     * @param options Les options pour filtrer (peut-être)
     * @returns La liste des oeuvres potentielles
     */
    async findOeuvreFromTitle(titre, options) {
      try {
        let searchResults = await this.searchPage(titre);
        if (!searchResults || searchResults.length === 0) {
          return [];
        }
        searchResults = searchResults.filter((data) => {
          return data.title.match(titre);
        });
        const resultsProv = searchResults.filter((data) => {
          return data.title.match(options.type);
        });
        if (resultsProv.length > 0) {
          searchResults = resultsProv;
        }
        searchResults = await this.getPageSummary(searchResults);
        searchResults = await this.getPageContent(searchResults);
        searchResults = await this.getInfobox(searchResults);
        searchResults = this.structureInfosFromSources(searchResults);
        return searchResults.map((result) => {
          return {
            titre: result.titre,
            titre_original: result.titre_original || result.titre,
            titre_francais: result.titre_francais,
            auteur: result.auteur,
            annee: result.annee,
            isbn: result.isbn,
            pays: result.pays,
            langue: result.langue,
            type: options.type,
            resume: result.resume
          };
        });
      } catch (error) {
        console.error("Erreur lors de la r\xE9cup\xE9ration des informations:", error);
        throw error;
      }
    }
    // Rechercher jusqu'à 10 pages Wikipedia par l'API correspondant au titre
    async searchPage(titre) {
      const searchUrl = `${this.wikiApiUrl}?action=query&format=json&list=search&srsearch=${encodeURIComponent(titre)}&srlimit=10&origin=*`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      return data.query?.search || [];
    }
    // Récupérer le résumé de la page
    async getPageSummary(searchResults) {
      return await Promise.all(
        searchResults.map(async (result) => {
          const summaryUrl = `${this.baseUrl}${encodeURIComponent(result.title)}`;
          const response = await fetch(summaryUrl);
          if (response.ok) {
            Object.assign(result, { summary: response.json() });
          }
          return result;
        })
      );
    }
    // Récupérer le contenu complet de la page
    async getPageContent(searchResults) {
      return Promise.all(
        searchResults.map(async (result) => {
          const contentUrl = `${this.wikiApiUrl}?action=query&format=json&titles=${encodeURIComponent(result.title)}&prop=extracts&exintro=false&explaintext=true&origin=*`;
          const response = await fetch(contentUrl);
          const data = await response.json();
          const pages = data.query.pages;
          const pageId = Object.keys(pages)[0];
          Object.assign(result, { pageContent: pages[pageId]?.extract || "" });
          return result;
        })
      );
    }
    // Récupérer l'infobox de la page
    async getInfobox(searchResults) {
      return Promise.all(
        searchResults.map(async (result) => {
          const infoboxUrl = `${this.wikiApiUrl}?action=query&format=json&titles=${encodeURIComponent(result.title)}&prop=revisions&rvprop=content&origin=*`;
          const response = await fetch(infoboxUrl);
          const data = await response.json();
          const pages = data.query.pages;
          const pageId = Object.keys(pages)[0];
          const content = pages[pageId]?.revisions?.[0]?.["*"] || "";
          const infobox = this.parseInfobox(content);
          Object.assign(result, {
            infoBox: infobox,
            annee: infobox.annee,
            auteur: infobox.auteur,
            isbn: infobox.isbn,
            pays: infobox.pays
          });
          return result;
        })
      );
    }
    // Parser l'infobox depuis le wikicode
    parseInfobox(wikicode) {
      const infobox = {};
      const patterns = {
        titre: /\|\s*titre\s*=\s*(.+)/i,
        titre_original: /\|\s*titre[_\s]*orig(?:inal)?\s*=\s*(.+)/i,
        titre_francais: /\|\s*titre[_\s]*français?\s*=\s*(.+)/i,
        auteur: /\|\s*auteurs?\s*=\s*(.+)/i,
        annee: /\|\s*(?:année|date)[_\s]*(?:publication|parution)?\s*=\s*(.+)/i,
        pays: /\|\s*pays\s*=\s*(.+)/i,
        langue: /\|\s*langue[_\s]*originale?\s*=\s*(.+)/i,
        isbn: /\|\s*isbn\s*=\s*(.+)/i,
        editeur: /\|\s*éditeurs?\s*=\s*(.+)/i
      };
      for (const [key, pattern] of Object.entries(patterns)) {
        const match = wikicode.match(pattern);
        if (match) {
          let value = match[1].trim();
          value = value.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1");
          value = value.replace(/{{[^}]+}}/g, "");
          value = value.replace(/<[^>]+>/g, "");
          infobox[key] = value.trim();
        }
      }
      if (infobox.annee) {
        infobox.annee = Number(infobox.annee.substring(0, 4));
      }
      if (infobox.isbn) {
        infobox.isbn = infobox.isbn.split(" ")[0];
      }
      return infobox;
    }
    structureInfosFromSources(searchResults) {
      return searchResults.map(
        (result) => this.extractBookInfo(result.summary, result.pageContent, result.infoBox, result.title)
      );
    }
    // Extraire les informations du livre depuis toutes les sources
    extractBookInfo(summary, content, infobox, pageTitle) {
      const bookInfo = {
        titre: null,
        titre_original: null,
        titre_francais: null,
        auteurs: null,
        annee: null,
        pays: null,
        langue: null,
        isbn: null,
        editeur: null,
        resume: null
      };
      try {
        bookInfo.titre = infobox.titre || pageTitle;
        bookInfo.titre_original = infobox.titre_original || this.extractFromText(content, /titre original[:\s]+([^\n.]+)/i);
        bookInfo.titre_francais = infobox.titre_francais || this.extractFromText(content, /titre français[:\s]+([^\n.]+)/i);
        bookInfo.auteurs = infobox.auteur || this.extractFromText(content, /(?:écrit par|auteur[:\s]+|de\s+)([A-Z][^\n.]+)/);
        const getAnnee = () => {
          const anneeMatch = this.extractFromText(content, /(?:publié en|paru en|écrit en)\s+(\d{4})/i);
          if (anneeMatch) {
            return Number(anneeMatch.match(/\d{4}/)?.[0]);
          }
        };
        bookInfo.annee = infobox.annee || getAnnee();
        bookInfo.pays = infobox.pays || this.extractFromText(content, /(?:pays d'origine|publié en|originaire de)\s+([A-Z][^\n.,]+)/i);
        bookInfo.langue = infobox.langue || this.extractFromText(content, /langue originale[:\s]+([^\n.,]+)/i);
        const isbnMatch = infobox.isbn || this.extractFromText(content, /ISBN[:\s]+([\d-]+)/i);
        bookInfo.isbn = isbnMatch;
        bookInfo.editeur = infobox.editeur || this.extractFromText(content, /(?:éditions|éditeur)[:\s]+([^\n.,]+)/i);
        bookInfo.resume = summary.extract || content.substring(0, 500) + "[\u2026]";
        Object.keys(bookInfo).forEach((key) => {
          if (!bookInfo[key] || typeof bookInfo[key] === "string" && bookInfo[key].trim() === "") {
            bookInfo[key] = null;
          }
        });
      } catch (erreur) {
        console.error("Erreur lors de l'extraction des donn\xE9es : ", erreur);
        bookInfo.error = erreur.message;
      }
      return bookInfo;
    }
    // Fonction utilitaire pour extraire du texte avec regex
    extractFromText(text, pattern) {
      const match = text.match(pattern);
      return match ? match[1].trim() : null;
    }
  };

  // src/webviews/models/OeuvreForm.ts
  var OeuvreForm = class extends FormManager {
    prefix = "oeuvre";
    formId = "oeuvre-form";
    properties = [
      { propName: "titre_affiche", type: String, required: true, fieldType: "text", onChange: this.onChangeTitreAffiched.bind(this) },
      { propName: "id", type: String, required: true, fieldType: "text" },
      { propName: "titre_original", type: String, required: true, fieldType: "text", onChange: this.onChangeTitreOriginal.bind(this) },
      { propName: "titre_francais", type: String, required: false, fieldType: "text" },
      { propName: "auteurs", type: String, required: true, fieldType: "text", onChange: this.onChangeAuteurs.bind(this) },
      { propName: "type", type: String, required: true, fieldType: "select", values: [["film", "Film"], ["s\xE9rie", "S\xE9rie"], ["roman", "Roman"], ["pi\xE8ce", "Pi\xE8ce"], ["livre", "Livre"], ["bd", "BD"]] },
      { propName: "annee", type: String, required: true, fieldType: "text" },
      { propName: "resume", type: String, required: false, fieldType: "textarea" },
      { propName: "notes", type: String, required: false, fieldType: "textarea" }
    ];
    // Table des raccourcis 'one key' propre au formulaire 
    tableKeys = {
      i: { lab: "Infos externes sur l\u2019\u0153uvre", fn: this.getOeuvreExternInfo.bind(this) }
    };
    static REG_AUTEUR = /([^ ]+) ([^\[])\[(H|F)\]/;
    afterEdit() {
      const id = this.getValueOf("id");
      const isNew = id === "";
      this.setIdLock(!isNew);
      this.panel.context = isNew ? "create-oeuvre" : "edit-oeuvre";
    }
    async checkEditedItem() {
      const item = this.editedItem;
      const changeset = item.changeset;
      const errors = [];
      let errs;
      if (changeset.isNew) {
      }
      const dbData = item.original;
      if (changeset.id !== void 0) {
        if (changeset.id === "" || !changeset.id) {
          errors.push("Il faut absolument que cet item ait un identifiant.");
        }
      }
      if (changeset.titre_origin !== void 0) {
        if (changeset.titre_original.trim().length === 0) {
          errors.push("Il faut fournir le titre de l\u2019\u0153uvre original.");
        }
      }
      if (changeset.auteurs !== void 0) {
        if (errs = this.checkAuteurs(changeset.auteurs)) {
          errors.push("erreurs trouv\xE9s sur les auteurs : " + errs);
        }
      }
      if (errors.length) {
        console.error("Donn\xE9es invalides", errors);
        return errors.join(", ").toLowerCase();
      }
    }
    /**
     * Vérification des auteurs. Pour le moment, on se contente de voir si
     * leur genre est bien défini.
     * 
     * @param auteurs String contenant tous les auteurs définis
     * @returns true/false
     */
    checkAuteurs(auteurs) {
      let auts = auteurs.trim();
      if (auts.length === 0) {
        return "Il faut imp\xE9rativement fournir les autrices et auteurs";
      }
      auts = auts.split(",").map((a) => a.trim());
      const errs = [];
      const genderErrs = this.checkAuteursHaveGender(auts);
      genderErrs && errs.push(genderErrs);
      if (errs.length) {
        return errs.join(", ");
      }
    }
    /**
     * Vérifie si les auteurs sont bien formatés (sexe au bout)
     * 
     * @param auteurs Liste des auteurs de l'œuvre
     * @returns Liste des erreurs trouvées (liste vide si aucune)
     */
    checkAuteursHaveGender(auteurs) {
      const errs = auteurs.map((aut) => {
        if (null === aut.match(/\[(H|F)\]$/)) {
          return aut;
        } else {
          return null;
        }
      }).filter((e) => e !== null);
      if (errs.length) {
        return `Il faut pr\xE9ciser le sexe de ${errs.join(", ")} (en mettant "[H]" ou "[F]" \xE0 la fin)`;
      }
    }
    observeForm() {
      const btnTMDB = this.obj.querySelector(".btn-get-infos");
      btnTMDB?.addEventListener("click", this.getOeuvreExternInfo.bind(this));
    }
    async getOeuvreExternInfo(ev) {
      const titre = (this.getValueOf("titre_original") || this.getValueOf("titre_affiche")).trim();
      if (titre === "") {
        this.flash("Il faut indiquer le titre de l\u2019\u0153uvre\xA0!", "error");
      } else {
        this.flash("Je r\xE9cup\xE8re les informations du film " + titre + "\u2026");
        const options = {
          langue: void 0,
          annee: this.getValueOf("annee"),
          type: this.getValueOf("type")
        };
        if (this.getValueOf("annee") !== "") {
          Object.assign(options, { annee: Number(this.getValueOf("annee")) });
        }
        const infos = await OeuvrePicker.findWithTitle(titre, options, this);
      }
      ev && stopEvent(ev);
    }
    onChangeAuteurs(ev = void 0) {
      let auteurs = this.getValueOf("auteurs").trim();
      if (auteurs !== "") {
        auteurs = auteurs.split(",").map((au) => au.trim());
        const errs = this.checkAuteursHaveGender(auteurs);
        if (errs) {
          this.flash(errs + ".", "error");
        }
      }
      return ev && stopEvent(ev);
    }
    onChangeTitreAffiched(ev = void 0) {
      const noTitreOriginal = this.getValueOf("titre_original") === "";
      const titaff = this.getValueOf("titre_affiche");
      if (this.editedItem.changeset.isNew) {
        if (Oeuvre.doOeuvresExist([titaff]).known.length) {
          this.flash("Ce titre existe d\xE9j\xE0. Si vous voulez vraiment le conserver, ajoutez un indice.", "error");
          this.setValueOf("titre_affiche", "");
          return ev && stopEvent(ev);
        }
        if (noTitreOriginal) {
          this.setTitreOriginalFromTitreAffiched();
          console.log("Il faut que je demande s'il faut rechercher les information du film sur TMDB");
        } else {
          this.flash("Le titre original est d\xE9fini, je ne le touche pas.");
        }
      }
    }
    flash(message, type = "notice") {
      Oeuvre.panel.flash(message, type);
    }
    REG_TITRE_AFF = /^(Les|Le|La|Une|Un|The|A) (.+)$/;
    setTitreOriginalFromTitreAffiched() {
      let titreOriginal = this.getValueOf("titre_affiche");
      if (titreOriginal.match(this.REG_TITRE_AFF)) {
        titreOriginal = titreOriginal.replace(this.REG_TITRE_AFF, (tout, article, reste) => {
          return `${reste} (${article})`;
        });
      }
      this.setValueOf("titre_original", titreOriginal);
      this.onChangeTitreOriginal();
    }
    /**
     * Méthode appelée quand on modifie le titre original (normalement,
     * ça n'arrive qu'en cas de nouvelle œuvre).
     * 
     * Noter qu'elle est appelée automatiquement quand le titre
     * original n'était pas défini et qu'on a défini le titre d'affi-
     * chage de l'œuvre.
     * 
     * C'est aussi ici qu'on met un ID automatique s'il n'est pas
     * défini.
     * 
     */
    onChangeTitreOriginal(ev = void 0) {
      const idNotDefined = this.getValueOf("id").trim() === "";
      const titorig = this.getValueOf("titre_original");
      if (titorig === "") {
        return;
      }
      if (this.editedItem.changeset.isNew) {
        if (Oeuvre.doOeuvresExist([titorig]).known.length) {
          Oeuvre.panel.flash("Ce titre existe d\xE9j\xE0. Si c'est vraiment une autre \u0153uvre, ajoutez-lui un indice", "error");
          this.setValueOf("titre_original", "");
          return;
        }
        if (idNotDefined) {
          this.setValueOf("id", this.idFromTitre(titorig));
        }
      }
      ev && stopEvent(ev);
    }
    /**
     * Compose un ID unique en fonction du titre original de l'œuvre
     */
    idFromTitre(titre) {
      let proposId = "";
      const mots = titre.split(" ").map((m) => StringNormalizer.rationalize(m));
      const nbMots = mots.length;
      if (nbMots >= 3) {
        const nbLettresFin = nbMots === 3 ? 2 : 1;
        proposId = mots.map((m, i) => {
          const isLastMot = i === nbMots - 1;
          const nbLettres = isLastMot ? nbLettresFin : 1;
          return m.substring(0, nbLettres).toUpperCase();
        }).join("");
        proposId = proposId.substring(0, 5);
      } else {
        proposId = titre.substring(0, 5).toUpperCase();
      }
      let annee;
      if (annee = this.getValueOf("annee")) {
        proposId += String(annee);
      } else {
        this.flash("Quand l\u2019ann\xE9e est pr\xE9cis\xE9e, elle est ajout\xE9e \xE0 l\u2019ID");
      }
      var iVar = 1;
      var idTested = String(proposId);
      while (Oeuvre.doIdExist(idTested)) {
        idTested = `${proposId}{++iVar}`;
      }
      return proposId;
    }
    /**
     * ENREGISTREMENT DE L'ŒUVRE
     * --------------------------
     * 
     * @param item L'oeuvre à enregistrer
     * @returns True si l'enregistrement a pu se faire correctement.
     */
    async onSaveEditedItem(data2save) {
      const itemSaver = new ComplexRpc({
        call: Oeuvre.saveItem.bind(Oeuvre, data2save)
      });
      const res = await itemSaver.run();
      if (res.ok) {
        Oeuvre.panel.flash("\u0152uvre enregistr\xE9e avec succ\xE8s.", "notice");
        let item, nextItem;
        [item, nextItem] = Oeuvre.accessTable.upsert(res.itemPrepared);
        if (nextItem) {
          Oeuvre.panel.insertInDom(item, nextItem);
        } else {
          Oeuvre.panel.updateInDom(item);
        }
      } else {
        console.error("ERREUR LORS DE L'ENREGISTREMENT DE L'OEUVRE", res.errors);
        Oeuvre.panel.flash("Erreur (enregistrement de l\u2019\u0153uvre (voir la console", "error");
      }
      return true;
    }
  };

  // src/webviews/models/Oeuvre.ts
  var Oeuvre = class _Oeuvre extends ClientItem {
    // Constructor and data access
    constructor(item) {
      super(item);
      this.item = item;
    }
    type = "oeuvre";
    static minName = "oeuvre";
    static klass = _Oeuvre;
    static currentItem;
    // Getters pour accès direct aux propriétés courantes
    get titre_affiche() {
      return this.item.dbData.titre_affiche;
    }
    get titre_original() {
      return this.item.dbData.titre_original;
    }
    get titre_francais() {
      return this.item.dbData.titre_francais;
    }
    get annee() {
      return this.item.dbData.annee;
    }
    get auteurs() {
      return this.item.dbData.auteurs;
    }
    get notes() {
      return this.item.dbData.notes;
    }
    get resume() {
      return this.item.dbData.resume;
    }
    static setAccessTableWithItems(items) {
      this._accessTable = new AccessTable(this.panel, items);
    }
    static _accessTable;
    /**
          ==== MÉTHODES DE CHECK ===
     */
    /**
     * Méthode qui checke l'existence de l'identifiant
     */
    static doIdExist(id) {
      return this.accessTable.exists(id);
    }
    /**
     * Méthode qui checke l'existence des oeuvres
     * 
     * @param oeuvres Liste des oeuvres, désignées par leur identifiant ou un de leurs titres
     * @return Une table avec les clés :known (oeuvres connues) et :unknown (oeuvres inconnues)
     */
    static doOeuvresExist(oeuvres) {
      const retour = { known: [], unknown: [] };
      oeuvres.forEach((oeuvre) => {
        if (this.accessTable.exists(oeuvre) || this.oeuvreExistsByTitle(oeuvre)) {
          retour.known.push(oeuvre);
        } else {
          retour.unknown.push(oeuvre);
        }
      });
      return retour;
    }
    static oeuvreExistsByTitle(title) {
      title = StringNormalizer.rationalize(title);
      return !!this.accessTable.find((item) => item.cachedData.titresLookUp.includes(title));
    }
    /**
     * 
     * Méthodes pour enregistrer les oeuvres
     */
    static saveItem(item, compRpcId) {
      RpcOeuvre.notify("save-item", { CRId: compRpcId, item });
    }
    static onSavedItem(params) {
      ComplexRpc.resolveRequest(params.CRId, params);
    }
    static autoCompleteBaliseTerm(triggre, ev) {
      return this.panel.flash("Auto compl\xE9tion seulement pour panneau des entr\xE9es.", "notice");
    }
  };
  var OeuvrePanelClass = class extends PanelClient {
    get accessTable() {
      return Oeuvre.accessTable;
    }
    tableKeys = {
      C: { lab: "choisir pour exemple", fn: this.chooseSelectedItemForExemple.bind(this) },
      E: { lab: "nouvel exemple pour s\xE9lection", fn: this.createExempleForSelectedItem.bind(this) }
    };
    chooseSelectedItemForExemple(confirmed) {
      if (confirmed === true) {
        const oeuvreId = this.getSelection();
        RpcOeuvre.notify("oeuvre-for-exemple", { oeuvreId, oeuvreTitre: this.accessTable.get(oeuvreId).dbData.titre_affiche });
      } else if (confirmed === false) {
        this.flash("Ok, on renonce.", "notice");
      } else {
        const selected = this.getSelection();
        if (selected) {
          const boutons = /* @__PURE__ */ new Map();
          boutons.set("o", ["Oui", this.chooseSelectedItemForExemple.bind(this, true)]);
          boutons.set("n", ["Renoncer", this.chooseSelectedItemForExemple.bind(this, false)]);
          this.flashAction("Veux-tu choisir cette \u0153uvre pour l'exemple \xE9dit\xE9 ?", boutons);
        } else {
          this.flash("Il faut s\xE9lectionner l'\u0153uvre voulue\xA0!", "warn");
        }
      }
    }
    createExempleForSelectedItem() {
      this.flash("Je dois cr\xE9er un exemple pour l'entr\xE9e courante.", "notice");
    }
    // Méthode permettant de filtrer la liste des exemples
    searchMatchingItems(searched) {
      const searchLower = StringNormalizer.toLower(searched);
      return this.filter(Oeuvre.accessTable, (oeuvre) => {
        return oeuvre.cachedData.titresLookUp.some((titre) => {
          return titre.substring(0, searchLower.length) === searchLower;
        });
      });
    }
    formateProp(item, prop, value) {
      switch (prop) {
        case "titre_francais":
          const titfr = item.dbData.titre_francais;
          if (!titfr || titfr === item.dbData.titre_original) {
            return "";
          }
      }
      return String(value);
    }
  };
  var OeuvrePanel = new OeuvrePanelClass({
    minName: "oeuvre",
    titName: "\u0152uvre",
    klass: Oeuvre,
    form: new OeuvreForm()
  });
  OeuvrePanel.form.setPanel(OeuvrePanel);
  Oeuvre.panel = OeuvrePanel;
  var RpcOeuvre = createRpcClient();
  RpcOeuvre.on("activate", () => {
    if (OeuvrePanel.isActif) {
      return;
    }
    OeuvrePanel.activate();
  });
  RpcOeuvre.on("desactivate", () => {
    if (OeuvrePanel.isInactif) {
      return;
    }
    OeuvrePanel.desactivate();
  });
  RpcOeuvre.on("populate", (params) => {
    Oeuvre.deserializeItems(params.data);
    OeuvrePanel.populate(Oeuvre.accessTable);
    OeuvrePanel.initKeyManager();
  });
  RpcOeuvre.on("display-oeuvre", (params) => {
    OeuvrePanel.scrollToAndSelect(params.oeuvreId);
  });
  RpcOeuvre.on("check-oeuvres", (params) => {
    const resultat = Oeuvre.doOeuvresExist(params.oeuvres);
    RpcOeuvre.notify("check-oeuvres-resultat", { CRId: params.CRId, resultat });
  });
  RpcOeuvre.on("after-saved-item", (params) => {
    Oeuvre.onSavedItem(params);
  });
  window.Oeuvre = Oeuvre;
})();
//# sourceMappingURL=oeuvres-bundle.js.map
