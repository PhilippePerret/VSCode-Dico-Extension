import { Constants } from '../../bothside/UConstants';
import { IEntry } from '../../extension/models/Entry';
import { PanelClassEntry } from '../../extension/services/panels/panelClassEntry';
import { ComplexRpc } from '../services/ComplexRpc';
import { FormManager, FormProperty } from "../services/FormManager";
import { Entry, RpcEntry } from "./Entry";

class FEntry extends Entry {
  [x:string]: any;
}
const allg: {[x: string]: string} = Constants.ENTRIES_GENRES;
const genres = Object.keys(allg).map( key => [key, allg[key]] );

export class EntryForm extends FormManager<typeof Entry, FEntry> {
  formId = 'entry-form';
  prefix = 'entry';
  properties: FormProperty[] = [
    {propName: 'entree', type: String, required: true, fieldType: 'text', onChange: this.onChangeEntree.bind(this)},
    {propName: 'id', type: String, required: true, fieldType: 'text'},
    {propName: 'genre', type: String, required: true, fieldType: 'select', values: genres},
    {propName: 'categorie_id', type: String, required: false, fieldType: 'text'},
    {propName: 'definition', type: String, required: false, fieldType: 'textarea'}
  ];
  static readonly REG_SHORT_DEF = /\b(cf\.|voir|synonyme|contraire)\b/;
  static readonly REGEX_APPELS_ENTRIES = new RegExp(`(?:${Object.keys(Constants.MARK_ENTRIES).join('|')})\\(([^)]+)\\)`, "g");
  static readonly REG_OEUVRES = /\boeuvre\(([^)]+)\)/g;
  
  onChangeEntree() {
    // console.log("Le champ Entrée a changé");
    const itemIsNew = this.getValueOf('id') === '';
    if ( itemIsNew ) {
      console.log("C'est un nouvel item, il faut calculer son ID d'après son entrée.");
    }
  }
  // À faire après l'édition d'une Entrée
  afterEdit(): void {
    const id = this.field('id').value ;
    const isNewItem = id === '' ;
    // Pour un nouvel item, il faut débloquer l'identifiant
    if (isNewItem) { this.setIdLock(false); }
  }

  /**
   * Grand méthode de check de la validité de l'item. On ne l'envoie
   * en enregistrement que s'il est parfaitement conforme. 
   */
  async checkItem(item: {
    [x:string]: any
  }): Promise<string | undefined> {
    const isNew = item.isNew;
    const errors: string[] = [];

    // Vérifications diverses et synchrones sur les données
    this.diverseChecks(item, errors);

    // Vérification de l'existence des oeuvres dans la
    // définition
    const unknownOeuvres: string[] = await this.checkExistenceOeuvres(item);
    if (unknownOeuvres.length) {
      errors.push(`des œuvres sont introuvables : ${unknownOeuvres.map(t => `"${t}"`).join(', ')}`);
    }

    // Vérification (complexe) de l'existence des exemples
    // définis dans la définition de l'entrée
    const unknownEx: string[] = await this.checkExistenceExemples(item);
    if ( unknownEx.length ) {
      errors.push(`des exemples sont introuvables: ${unknownEx.join(', ')}`);
    }


    // résultat final retourné
    if (errors.length) {
      console.error("Données invalides", errors);
      return errors.join(', ').toLowerCase();
    }
  }

  async checkExistenceOeuvres(item: {[x: string]: any}): Promise<string[]> {
    const checkerOeuvres = new ComplexRpc({
      call: this.searchUnknownOeuvresIn.bind(this, item.definition)
    });
    let resultat: unknown = await checkerOeuvres.run();
    const res = (resultat as {known: string[], unknown: string[]});
    console.log("Retour après checkerOeuvres", resultat);
    return res.unknown;
  }

  diverseChecks(item: {[x: string]: any}, errors: string[]): string[] {
    
    // L'entrée doit être définie
    if (item.entree === '') {
      errors.push("L'entrée doit être définie");
    }
    // L'entrée doit être unique (si elle a changée)
    if (item.changeset.has('entree')) {
      const newEntree = item.changeset.get('entree');
      console.log("L'entrée a changé (%s/%s)", item.original.entree, newEntree);
      if ( Entry.doesEntreeExist(newEntree)) {
        errors.push(`L'entrée "${newEntree}" existe déjà…`);
      }
    }
    // L'identifiant doit être défini
    if (item.id === ''){
      errors.push("L'identifiant doit absoluement être défini");
    } else if (item.changeset.has('id')) {
      // L'identifiant doit être unique (si nouveau)
      if (Entry.doesIdExist(item.id)) {
        errors.push(`L'identifiant "${item.id}" existe déjà. Je ne peux le réattribuer`);
      }
    }
    // La définition doit être donnée et valide
    if ( item.definition === ''){
      errors.push("La définition du mot doit être donnée");
    } else if (item.changeset.has('definition')) {
      // Définition trop courte, sans justifications
      if ( item.definition.length < 50 && null === item.definition.match(EntryForm.REG_SHORT_DEF)) {
        errors.push("La définition est courte, sans justification…");
      }
      const unknownEntries = this.searchUnknownEntriesIn(item.definition);
      if ( unknownEntries.length > 0) {
        errors.push(`entrées inconnues dans la défintion (${unknownEntries.join(', ')})`);
      }
    } else {
      console.log("La définition n'a pas été modifiée.");
    }

    // Le genre doit être donné
    if ( item.genre === '') {
      errors.push("Le genre de l'entrée doit être donné");
    } else if (item.changeset.has('genre') && Object.keys(Constants.ENTRIES_GENRES).includes(item.genre)) {
      errors.push(`bizarrement, le genre "${item.genre} est inconnu…`);
    }
    
    //  Si les catégories sont définies, il faut qu'elles existent
    // Rappel : Une "catégorie", c'est simplement l'ID d'une entrée
    // (c'est la particularité du dictionnaire, mais ça tombe sous le
    // sens) 
    if (item.categorie_id !== '' && item.changeset.has('categorie_id')) {
      const unknownCategorie = this.checkUnknownCategoriesIn(item.categorie_id);
      if (unknownCategorie.length) {
        errors.push(`des catégories sont inconnues : ${unknownCategorie.join(', ')}`);
      }
    }
    return errors;
  }


  // Pour chercher les entrées mentionnées dans la définition
  searchUnknownEntriesIn(str: string): string[] {
    const founds: string[] = [];
    const matches = str.matchAll(EntryForm.REGEX_APPELS_ENTRIES);
    for (const match of matches) {
      const foo = match[1];
      let [entry, entryId] = foo.split('|');
      entryId = (entryId || entry).trim();
      /**
       * L'entrée peut être désignée par de multiples formes :
       * - son identifiant
       * - son identifiant pluriel (rare)
       * - son entrée (minuscules)
       * - son entrée plurielle (minuscules)
       */
      if ( Entry.doesIdExist(entryId) ) {
        console.log("Id d'entrée existante", entryId);
      } else if ( Entry.doesEntreeExist(entryId)) {
        console.log("Entrée existante (par son nom)", entryId);
      } else if (entryId.endsWith('s')) {
        const entryIdSing = entryId.substring(0, entryId.length-1);
        if ( Entry.doesEntreeExist(entryIdSing)) {
          console.log("Entrée existante (pas son nom singulier)", entryId);
        } else if (Entry.doesIdExist(entryIdSing)) {
          console.log("Id entrée existante (dans sa forme singulière)", entryId);
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
  searchUnknownOeuvresIn(str: string, CRId: string): void {
    // 1. On relève les oeuvres
    const matches = str.matchAll(EntryForm.REG_OEUVRES);
    const oeuvres: string[] = [];
    for (let match of matches) { oeuvres.push(match[1]); }
    console.log("Oeuvres à checker", oeuvres);
    // 2. On les envoie à la vérification
    RpcEntry.notify('check-oeuvres', { CRId, oeuvres });
  }

  /**
   * Fonction principale pour checker les exemples dans la définition
   * C'est elle qui initie la requête Rpc complexe. 
   */
  async checkExistenceExemples(item: { [x: string]: any }): Promise<string[]> {
    const comp = new ComplexRpc({
      call: this.searchUnknownExemplesIn.bind(this, item.definition)
    });
    const resultat = await comp.run();
    const res = resultat as {known: string[], unknown: string[]};
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
  searchUnknownExemplesIn(str: string, CRId: string): void {
    let matches = str.matchAll(/EXEMPLES\[([^\]]+)\]/g);
    const exemples: string[][] = [];
    for (var match of matches) {
      match[1]
        .split(',')
        .map(s => s.trim())
        .forEach(paire => {
          const [oeuvreId, exIndice] = paire.split(':');
          exemples.push([oeuvreId, exIndice]);
        });
    }
    RpcEntry.notify('check-exemples', {CRId, exemples});
  }
  
  // @return la liste des catégories inconnues
  checkUnknownCategoriesIn(str: string): string[] {
    const cats = str.split(',').map(s => s.trim());
    // return cats.filter(Entry.doesIdExist.bind(Entry));
    return cats.filter(cat => false === Entry.doesIdExist(cat));
  }

  /**
   * ENREGISTREMENT DE L'ENTRÉE
   * -------------------------- 
   * Procédure complexe (ComplexRpc)
   */
  async onSave(item: Entry) {
    console.info("Données à sauvegarder", item);
    const itemSaver = new ComplexRpc({
      call: Entry.saveItem.bind(Entry, item as unknown as IEntry)
    });
    const res = await itemSaver.run() as {ok: boolean, errors: any, item: IEntry};
    console.log("res dans onSave", res);
    if (res.ok) {
      console.log("Après l'enregistrement de l'item, je dois apprendre à updater l'item (plutôt en méthode générale ?)");
      Entry.panel.flash("Item enregistré avec succès.", 'notice');
    } else {
      console.error("ERREURS LORS DE L'ENREGISTREMENT DE L'ITEM", res.errors);
    }

    return true; // quand ça a été bien enregistré
  }

  /**
   * Observation propre du formulaire des Entrées
   * 
   */
  observeForm(): void {
    // Le bouton pour changer l'ID
    this.btnLockId.addEventListener('click', this.onLockId.bind(this));
  }
  get btnLockId() { return this.obj.querySelector('button.btn-lock-id') as HTMLButtonElement; }

  onLockId() {
    this.toggleIdLock(); // méthode générique de FormManager
  }
}