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

      ### Autocompl\xE9tion


      ${this.buildShortcutsTable([
            { s: "tt\u21E5", m: "EDIT", d: "Ajouter un mot technique index\xE9" },
            { s: "->(\u21E5", m: "EDIT", d: "Ajouter un mot technique avec num\xE9ro de page" },
            { s: "ttp\u21E5", m: "EDIT", d: "Ajouter la page d\u2019un mot technique" }
          ])}


      ### Insertion d'un exemple (existant)


      Avec l'item en \xE9dition et le curseur plac\xE9 au bon endroit, rejoindre le panneau des exemples (\u23183), filtrer pour n'afficher que le film (<shortcut>s</shortcut> puis 1res lettres), s\xE9lectionner l'exemple voulu (<shortcut>j</shortcut>/<shortcut>k</shortcut>) et enfin tapez <shortcut>i</shortcut> (comme \xAB\xA0identifiant\xA0\xBB ou \xAB\xA0ins\xE9rer\xA0\xBB).

      Automatiquement, l'identifiant de l'exemple sera ins\xE9r\xE9 dans l'entr\xE9e \xE9dit\xE9e.
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
        case "i":
          this.klass.sendIdCurrentToDefinition();
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
      }
      this.threelast.shift();
      this.threelast.push(ev.key);
      this.twolast.shift();
      this.twolast.push(ev.key);
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
      const msgbox = this.messageBox;
      const o = document.createElement("div");
      o.className = type;
      o.innerHTML = msg;
      msgbox.appendChild(o);
      msgbox.style.zIndex = "10";
      msgbox.style.opacity = "1";
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
      msgbox.style.opacity = "0.6";
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
      const btnPanic = document.querySelector(".btn-sos");
      btnPanic.addEventListener("click", this.onClickPanicButton.bind(this));
    }
    /**
     * Méthode appelée quand on clique sur le bouton 'SOS' du panneau 
     * courant lorsqu'il est bloqué. Pour tenter de débloquer la
     * situation.
     * 
     * @param ev Évènement souris qui a généré l'appel
     */
    onClickPanicButton(ev) {
      console.log("[onClickPanicButton] Tentative de sortie de blocage");
      if (this.form.isActive()) {
        this.form.cancelEdit();
      }
      this.keyManager.setMode("normal");
    }
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

  // src/bothside/UConstants.ts
  var Constants = class {
    static ENTRIES_GENRES = {
      "nm": "n.m.",
      "nmp": "n.m.pl.",
      "nf": "n.f.",
      "np": "n.pl.",
      "vb": "verbe",
      "adj": "adj.",
      "adv": "adv.",
      "la": "loc.adv."
    };
    static genreNotExists(genre) {
      return !this.ENTRIES_GENRES[genre];
    }
    static getGenre(genreId) {
      return this.ENTRIES_GENRES[genreId] || "inconnu";
    }
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
      if (this.editedItem) {
        let data2save = structuredClone(this.editedItem.changeset);
        this.editedItem.data2save = data2save;
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
      this.collectValues();
      const item = this.editedItem;
      this.properties.forEach((dproperty) => {
        const prop = dproperty.propName;
        if (item[prop] !== item.original[prop] && this.editedItem) {
          Object.assign(this.editedItem.changeset, {
            [prop]: item[prop],
            size: ++item.changeset.size
          });
        }
      });
      if (this.itemIsEmpty()) {
        this.panel.flash("Aucune donn\xE9e n'a \xE9t\xE9 founie\u2026", "error");
        return true;
      }
      if (this.editedItem && this.editedItem.changeset.size === 0) {
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
      const fakeItem = this.collectValues();
      if (this.editedItem) {
        const data2save = structuredClone(this.editedItem.original);
        Object.assign(data2save, this.editedItem.data2save);
        const removedProps = ["isNew", "size"];
        removedProps.push(...this.propsToRemove());
        const data2saveEpured = {};
        for (var k in data2save) {
          if (removedProps.includes(k)) {
            continue;
          }
          Object.assign(data2saveEpured, { [k]: data2save[k] });
        }
        console.log("Donn\xE9es FINALES \xE0 sauvegarder", structuredClone(data2saveEpured));
        await this.onSaveEditedItem(data2saveEpured);
      }
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
      if (this.editedItem) {
        this.properties.forEach((dprop) => {
          const prop = dprop.propName;
          const value = this.getValueOf(dprop);
          this.editedItem && Object.assign(this.editedItem, { [prop]: value });
        });
      }
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
      this.editedItem = void 0;
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
      // <touche>: {lab: 'label pour info', fn: <fonction bindée>}, par exemple
      // 'i': {lab: 'obtenir des infos', fn: this.showInfo.bind(this)}
    };
    static REG_SHORT_DEF = /\b(cf\.|voir|synonyme|contraire)\b/;
    static REGEX_APPELS_ENTRIES = new RegExp(`(?:${Object.keys(Constants.MARK_ENTRIES).join("|")})\\(([^)]+)\\)`, "g");
    static REG_OEUVRES = /\boeuvre\(([^)]+)\)/g;
    onChangeEntree() {
      const itemIsNew = this.getValueOf("id") === "";
      if (itemIsNew) {
        let proposId = this.getValueOf("entree");
        if (proposId !== "") {
          proposId = StringNormalizer.rationalize(proposId);
          this.setValueOf("id", proposId);
        }
      }
    }
    // À faire juste après la mise en édition d'une Entrée
    afterEdit() {
      const id = this.getValueOf("id");
      const isNew = id === "";
      if (isNew) {
        this.setIdLock(false);
      }
      this.panel.context = isNew ? "create-entry" : "edit-entry";
    }
    /**
     * Pour insérer du texte dans un champ d'édition (pour le moment,
     * je pense que ça ne fonctionne pour les textareas, mais il
     * faudrait essayer aussi avec les input-text)
     */
    insertInTextField(fieldId, texte) {
      const target = this.field(fieldId);
      target.setRangeText(
        texte,
        target.selectionStart,
        target.selectionEnd,
        "end"
      );
    }
    /**
     * Grande méthode de check de la validité de l'item. On ne l'envoie
     * en enregistrement que s'il est parfaitement conforme. 
     */
    async checkEditedItem() {
      if (void 0 === this.editedItem) {
        return "Curieusement, il ne semble pas y avoir d\u2019item \xE9dit\xE9\u2026";
      }
      const item = this.editedItem;
      const changeset = item.changeset;
      const errors = [];
      this.diverseChecks(item.changeset, errors);
      if (changeset.definition !== void 0) {
        const unknownOeuvres = await this.checkExistenceOeuvres(changeset.definition);
        if (unknownOeuvres.length) {
          errors.push(`des \u0153uvres sont introuvables : ${unknownOeuvres.map((t) => `"${t}"`).join(", ")}`);
        }
        const unknownEx = await this.checkExistenceExemples(changeset.definition);
        if (unknownEx.length) {
          errors.push(`des exemples sont introuvables: ${unknownEx.join(", ")}`);
        }
      }
      if (errors.length) {
        console.error("Donn\xE9es invalides", errors);
        return errors.join(", ").toLowerCase();
      }
    }
    async checkExistenceOeuvres(definition) {
      const checkerOeuvres = new ComplexRpc({
        call: this.searchUnknownOeuvresIn.bind(this, definition)
      });
      let resultat = await checkerOeuvres.run();
      const res = resultat;
      console.log("Retour apr\xE8s checkerOeuvres", resultat);
      return res.unknown;
    }
    diverseChecks(changeset, errors) {
      if (changeset.entree !== void 0 && changeset.entree === "") {
        if (changeset.entree === "") {
          errors.push("L'entr\xE9e doit \xEAtre d\xE9finie");
        }
        if (Entry.doesEntreeExist(changeset.entree)) {
          errors.push(`L'entr\xE9e "${changeset.entree}" existe d\xE9j\xE0\u2026`);
        }
      }
      if (changeset.id !== void 0) {
        if (changeset.id === "") {
          errors.push("L'identifiant doit absoluement \xEAtre d\xE9fini");
        }
        if (Entry.doesIdExist(changeset.id)) {
          errors.push(`L'identifiant "${changeset.id}" existe d\xE9j\xE0. Je ne peux le r\xE9attribuer`);
        }
      }
      const def = changeset.definition;
      if (def !== void 0) {
        def === "" && errors.push("La d\xE9finition du mot doit \xEAtre donn\xE9e");
        if (def !== "" && def.length < 50 && null === def.match(_EntryForm.REG_SHORT_DEF)) {
          errors.push("La d\xE9finition est courte, sans justification\u2026");
        }
        const unknownEntries = this.searchUnknownEntriesIn(def);
        if (unknownEntries.length > 0) {
          errors.push(`entr\xE9es inconnues dans la d\xE9fintion (${unknownEntries.join(", ")})`);
        }
      } else {
        console.log("La d\xE9finition n'a pas \xE9t\xE9 modifi\xE9e.");
      }
      if (changeset.genre !== void 0) {
        changeset.genre !== "" || errors.push("Le genre de l'entr\xE9e doit \xEAtre donn\xE9");
        if (Constants.genreNotExists(changeset.genre)) {
          errors.push(`bizarrement, le genre "${changeset.genre} est inconnu\u2026`);
        }
      }
      if (changeset.categorie_id !== void 0 && changeset.categorie_id !== "") {
        const unknownCategorie = this.checkUnknownCategoriesIn(changeset.categorie_id);
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
        } else if (Entry.doesEntreeExist(entryId)) {
        } else if (entryId.endsWith("s")) {
          const entryIdSing = entryId.substring(0, entryId.length - 1);
          if (Entry.doesEntreeExist(entryIdSing)) {
          } else if (Entry.doesIdExist(entryIdSing)) {
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
    async checkExistenceExemples(definition) {
      const comp = new ComplexRpc({
        call: this.searchUnknownExemplesIn.bind(this, definition)
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
    async onSaveEditedItem(data2save) {
      const itemSaver = new ComplexRpc({
        call: Entry.saveItem.bind(Entry, data2save)
      });
      const res = await itemSaver.run();
      if (res.ok) {
        Entry.panel.flash("Entr\xE9e enregistr\xE9e avec succ\xE8s en DB.", "notice");
        let item, nextItem;
        [item, nextItem] = Entry.accessTable.upsert(res.itemPrepared);
        if (nextItem) {
          Entry.panel.insertInDom(item, nextItem);
        } else {
          Entry.panel.updateInDom(item);
        }
      } else {
        console.error("ERREURS LORS DE L'ENREGISTREMENT DE L'ITEM", res.errors);
        Entry.panel.flash("Erreur (enregistrement de l\u2019entr\xE9e (voir la console", "error");
        return false;
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

  // src/webviews/services/TextFormater.ts
  var TextFormater = class _TextFormater {
    static formate(panel, obj, as) {
      const Formater = new _TextFormater({ panel, obj, as });
      Formater.formate();
    }
    panel;
    obj;
    as;
    constructor(params) {
      this.panel = params.panel;
      this.obj = params.obj;
      this.as = params.as;
    }
    // Raccourci
    flash(msg, type) {
      this.panel.flash(msg, type);
    }
    formate() {
      const rawContent = this.obj.innerText;
      if (rawContent.startsWith("<formated>")) {
        this.flash("Ce contenu a d\xE9j\xE0 \xE9t\xE9 mis en forme\u2026", "warn");
        return;
      }
      const formater = this.formaterPerType(this.as);
      const formatedText = "<formated>" + formater(this.obj.innerText);
      this.obj.innerHTML = formatedText;
      this.obj.querySelectorAll("a").forEach((alink) => {
        alink.addEventListener("click", this.panel.onClickALink.bind(this.panel, alink));
      });
      this.flash("Contenu mis en forme.", "notice");
    }
    formaterPerType(as) {
      switch (as) {
        case "definition":
          return this.formateDefinition.bind(this);
        case "exemple":
          return this.formateExemple.bind(this);
      }
    }
    REG_EXEMPLES = /EXEMPLES\[([^\]]+)\]/g;
    formateDefinition(content) {
      return content.replace(/ttp\(([^)|]+)(?:\|([^)]+))?\)/g, this.replacerEntryLinkWithPage.bind(this, "tt")).replace(/tt\(([^)|]+)(?:\|([^)]+))?\)/g, this.replacerEntryLink.bind(this, "tt")).replace(/ttw\(([^)|]+)(?:\|([^)]+))?\)/g, this.replacerEntryLink.bind(this, "no-style")).replace(/\-\>\(([^)|]+)(?:\|([^)]+))?\)/g, this.replacerEntryLink.bind(this, "arrowed")).replace(/dim\(([^)]+)\)/g, this.formateDiminutif.bind(this)).replace(this.REG_EXEMPLES, this.replacerExemples.bind(this));
    }
    formateExemple(content) {
      return content;
    }
    /**
     * 
     * === MÉTHODES DE FORMATAGE ===
     * 
     * 
     */
    TABLE_DIMS = /* @__PURE__ */ new Map();
    formateDiminutif(_tout, term) {
      term = term.trim();
      if (this.TABLE_DIMS.has(term)) {
        return this.TABLE_DIMS.get(term);
      }
      const dimi = "<em>" + term.split(/([ \-’])/).map((mot) => {
        switch (mot) {
          case " ":
            return " ";
          case "-":
            return "-";
          case "de":
          case "du":
          case "des":
          case "la":
          case "le":
          case "d":
            return mot;
          default:
            return mot.replace(/^(.)[^œaeiouyéèêëîïàâôùûü]*/i, "$1.");
        }
      }).join("") + "</em>";
      this.TABLE_DIMS.set(term, dimi);
      return dimi;
    }
    replacerExemples(_tout, exemples_marks) {
      return "EXEMPLES\xA0: " + exemples_marks.split(",").map((ex) => {
        let [oeuvreId, exIndice] = ex.trim().split(":");
        return `<a data-type="exemple" data-id="${ex}" data-method="goToExemple">Exemple n\xB0${exIndice} de l\u2019\u0153uvre ${oeuvreId}</a>`;
      }).join(", ");
    }
    replacerEntryLinkWithPage(type, tout, idOrText, id) {
      return this.replacerEntryLink(type, tout, idOrText, id) + " (p. xxx)";
    }
    replacerEntryLink(type, _tout, idOrText, id) {
      let defId = StringNormalizer.rationalize(String(id || idOrText));
      if (false === this.idExists(defId)) {
        if (defId.endsWith("s")) {
          defId = defId.substring(0, defId.length - 1);
        }
      }
      if (false === this.idExists(defId)) {
        this.flash("Identifiant inconnu : " + defId, "error");
        return `[Unknown ID ${idOrText}]`;
      }
      const text = String(idOrText);
      return `<a class="${type}" data-id="${defId}" data-method="goToDef">${text}</a>`;
    }
    idExists(itemId) {
      return this.panel.accessTable.exists(itemId);
    }
  };

  // src/webviews/services/AutoCompletion.ts
  var AutoComplete = class _AutoComplete {
    static autocomp;
    static start(params) {
      this.autocomp = new _AutoComplete(params);
      this.autocomp.run();
    }
    static removeCurrent() {
      this.autocomp = void 0;
    }
    /**
     * 
     * 
     * ================= INSTANCE ===============
     * 
     * 
     * 
     */
    target;
    accessTable;
    balIn;
    balOut;
    finalValue = "";
    obj;
    // le widget
    input;
    // le champ pour écrire
    menu;
    // La liste pour mettre le filtrage
    candidats = [];
    candidatsCount = 0;
    constructor(params) {
      this.target = params.target;
      this.accessTable = params.accessTable;
      this.balIn = params.balIn;
      this.balOut = params.balOut;
    }
    run() {
      this.build();
      this.observe();
      this.initList();
    }
    finish() {
      this.obj.remove();
      const cible = this.target;
      console.log("cible", cible);
      cible.focus();
      cible.setRangeText(
        this.balIn + this.finalValue + this.balOut,
        cible.selectionStart,
        cible.selectionEnd,
        "end"
      );
      _AutoComplete.removeCurrent();
    }
    initList() {
      this.peuple(this.accessTable.filterWithText(""));
    }
    /**
     * Fonction pour choisir finalement l'item
     */
    select() {
      const indice = Number(this.menu.dataset.indice);
      if (isNaN(indice)) {
        console.warn("Aucun mot n'a \xE9t\xE9 s\xE9lectionn\xE9.");
        return;
      }
      const item = this.candidats[indice];
      const key = item.key;
      const value = item.value.toLowerCase();
      if (key === value) {
        this.finalValue = key;
      } else {
        this.finalValue = `${value}|${key}`;
      }
      console.log("S\xE9lection", key, value);
      this.finish();
    }
    selectNext() {
      this.lowlightSelected();
      let indice = Number(this.menu.dataset.indice || -1);
      console.log("Indice = %i", indice);
      indice++;
      if (indice > this.candidatsCount) {
        indice = this.candidatsCount - 1;
      }
      this.menu.dataset.indice = String(indice);
      this.highlightSelected();
    }
    selectPrev() {
      this.lowlightSelected();
      let indice = Number(this.menu.dataset.indice || 1) - 1;
      console.log("Indice = %i", indice);
      if (indice < 0) {
        indice = 0;
      }
      this.menu.dataset.indice = String(indice);
      this.highlightSelected();
    }
    highlightSelected() {
      const indice = Number(this.menu.dataset.indice);
      this.menu.options[indice]?.classList.add("selected");
    }
    lowlightSelected() {
      const indice = Number(this.menu.dataset.indice);
      this.menu.options[indice]?.classList.remove("selected");
    }
    selectFirst() {
      this.menu.dataset.indice = "0";
      this.highlightSelected();
    }
    onInput(ev) {
      ev.stopPropagation();
      switch (ev.key) {
        case "ArrowDown":
          this.selectNext();
          return stopEvent(ev);
        case "ArrowUp":
          this.selectPrev();
          return stopEvent(ev);
        case "Enter":
          this.select();
          return stopEvent(ev);
        case "ArrowLeft":
        case "ArrowRight":
        case "Tab":
        case "Shift":
          return stopEvent(ev);
      }
      const candidats = this.accessTable.filterWithText(this.input.value + ev.key);
      this.candidats = candidats;
      this.candidatsCount = candidats.length;
      this.peuple(candidats);
      return true;
    }
    peuple(candidats) {
      this.menu.innerHTML = "";
      candidats.forEach((candidat) => {
        const option = document.createElement("option");
        option.value = candidat.key;
        option.innerHTML = candidat.value;
        this.menu.appendChild(option);
      });
      this.selectFirst();
    }
    observe() {
      this.input.focus();
      this.input.addEventListener("keydown", this.onInput.bind(this));
    }
    build() {
      const o = document.createElement("div");
      this.obj = o;
      o.className = "autocompleter";
      const input = document.createElement("input");
      o.appendChild(input);
      input.type = "text";
      this.input = input;
      const menu = document.createElement("select");
      o.appendChild(menu);
      menu.size = 15;
      this.menu = menu;
      document.body.appendChild(o);
    }
  };

  // src/webviews/models/Entry.ts
  var Entry = class _Entry extends ClientItem {
    type = "entry";
    static minName = "entry";
    static klass = _Entry;
    static currentItem;
    // Constructor and data access
    constructor(item) {
      super(item);
    }
    // Getters pour accès direct aux propriétés courantes
    get entree() {
      return this.item.dbData.entree;
    }
    get genre() {
      return this.item.dbData.genre;
    }
    get categorie_id() {
      return this.item.dbData.categorie_id;
    }
    get definition() {
      return this.item.dbData.definition;
    }
    static setAccessTableWithItems(items) {
      this._accessTable = new AccessTable(this.panel, items);
    }
    static _accessTable;
    /*
        === MÉTHODES DE CHECK ===
     */
    // @return true si l'entrée +entree+ existe déjà
    static doesEntreeExist(entree) {
      entree = entree.toLowerCase();
      return this.accessTable.find((item) => item.cachedData.entree_min === entree) !== void 0;
    }
    // @return true si l'identifiant +id+ existe déjà
    static doesIdExist(id) {
      return this.accessTable.exists(id);
    }
    /**
     * Méthode pour enregistrer l'item dans la table
     * 
     * 
     */
    static saveItem(item, compRpcId) {
      RpcEntry.notify("save-item", { CRId: compRpcId, item });
    }
    static autoCompleteBaliseTerm(trigger, ev) {
      stopEvent(ev);
      AutoComplete.start({
        target: ev.target,
        accessTable: this.accessTable,
        balIn: "(",
        balOut: ")"
      });
      return false;
    }
    static autocompleteDim(ev) {
      const edItem = this.panel.form.getEditedItem();
      if (edItem) {
        const entree = this.accessTable.get(edItem.original.id).cachedData.entree_min;
        const target = ev.target;
        target.setRangeText(
          "(" + entree + ")",
          target.selectionStart,
          target.selectionEnd,
          "end"
        );
      }
      return stopEvent(ev);
    }
    // Juste parce que cette méthode doit exister pour chaque panneau,
    // mais pour le panneau entrée, elle ne sert à rien
    // (elle est invoquée sur les deux autres panneaux pour transmettre
    // à ce panneau l'identifiant de l'item sélectionné — l'exemple ou 
    // l'œuvre)
    static sendIdCurrentToDefinition() {
    }
  };
  var EntryPanelClass = class extends PanelClient {
    // Raccourcis
    get accessTable() {
      return Entry.accessTable;
    }
    get selection() {
      return this.accessTable.getSelection();
    }
    /**
     * Raccourcis clavier propre au panneau
     */
    tableKeys = {
      C: { lab: "choisir pour l\u2019exemple", fn: this.chooseSelectedItemForExemple.bind(this) },
      E: { lab: "exemple pour s\xE9lection", fn: this.createExempleForSelectedItem.bind(this) },
      m: { lab: "mettre en forme", fn: this.miseEnFormSelection.bind(this) }
    };
    miseEnFormSelection(ev) {
      if (this.selection) {
        TextFormater.formate(
          this,
          this.accessTable.getObj(this.selection).querySelector("div.entry-definition"),
          "definition"
        );
      } else {
        this.flash("Il faut s\xE9lectionner (f/k) l\u2019entr\xE9e \xE0 mettre en forme.", "warn");
      }
      return ev && stopEvent(ev);
    }
    chooseSelectedItemForExemple(confirmed) {
      if (confirmed === true) {
        const entryId = this.getSelection();
        RpcEntry.notify("entry-for-exemple", { entryId, entryEntree: this.accessTable.get(entryId).dbData.entree });
      } else if (confirmed === false) {
        this.flash("Ok, on renonce.", "notice");
      } else {
        const selected = this.getSelection();
        if (selected) {
          const boutons = /* @__PURE__ */ new Map();
          boutons.set("o", ["Oui", this.chooseSelectedItemForExemple.bind(this, true)]);
          boutons.set("n", ["Renoncer", this.chooseSelectedItemForExemple.bind(this, false)]);
          this.flashAction("Veux-tu choisir cette entr\xE9e pour l'exemple \xE9dit\xE9 ?", boutons);
        } else {
          this.flash("Il faut s\xE9lectionner l'entr\xE9e voulue\xA0!", "warn");
        }
      }
    }
    createExempleForSelectedItem() {
      this.flash("Je dois cr\xE9er un exemple pour l'entr\xE9e courante.", "notice");
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
      return this.filter(Entry.accessTable, (item) => {
        item = item;
        return item.cachedData.entree_min.startsWith(prefixLower) || item.cachedData.entree_min_ra.startsWith(prefixRa);
      });
    }
    // Méthode jouée quand on clique sur un lien dans une définition
    goToDef(id) {
      console.log("Le goToDef du panneau ave l'identifiant :", id);
      this.scrollToAndSelect(id);
      this.flash("Utiliser la touche <shortcut>b</shortcut> (comme \xAB\xA0back\xA0\xBB) pour revenir \xE0 la d\xE9finition.", "notice");
    }
    goToExemple(id) {
      RpcEntry.notify("show-exemple", { exId: id });
    }
    // Pour insérer l'identifiant de l'exemple dans la définition
    insertExempleIdInDefinition(exempleId) {
      if (this.form.isActive()) {
        this.activate();
        this.form.insertInTextField("definition", exempleId);
      } else {
        this.flash("Pour coller un identifiant d\u2019exemple, il faut \xE9diter une d\xE9finition.", "warn");
      }
    }
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
  RpcEntry.on("flash", (params) => {
    EntryPanel.flash(params.message, params.type || "notice");
  });
  RpcEntry.on("start", () => {
  });
  RpcEntry.on("activate", () => {
    if (EntryPanel.isActif) {
      return;
    }
    EntryPanel.activate();
  });
  RpcEntry.on("desactivate", () => {
    if (EntryPanel.isInactif) {
      return;
    }
    EntryPanel.desactivate();
  });
  RpcEntry.on("populate", (params) => {
    Entry.deserializeItems(params.data);
    EntryPanel.populate(Entry.accessTable);
    EntryPanel.initKeyManager();
  });
  RpcEntry.on("display-entry", (params) => {
    console.log("[CLIENT] Je dois afficher l'entr\xE9e '%s'", params.entry_id);
    EntryPanel.scrollToAndSelect(params.entry_id);
  });
  RpcEntry.on("check-oeuvres-resultat", (params) => {
    ComplexRpc.resolveRequest(params.CRId, params.resultat);
  });
  RpcEntry.on("check-exemples-resultat", (params) => {
    ComplexRpc.resolveRequest(params.CRId, params.resultat);
  });
  RpcEntry.on("after-saved-item", (params) => {
    ComplexRpc.resolveRequest(params.CRId, params);
  });
  RpcEntry.on("send-id-exemple-to-definition", (params) => {
    EntryPanel.insertExempleIdInDefinition(params.exempleId);
  });
  window.Entry = Entry;
  window.RpcEntry = RpcEntry;
})();
//# sourceMappingURL=entries-bundle.js.map
