import { Constants } from '../../bothside/UConstants';
import { FormManager, FormProperty } from "../services/FormManager";
import { Entry } from "./Entry";

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
  checkItem(item: {[x:string]: any}): string | undefined {
    const isNew = item.isNew ;
    const errors: string[] = [];
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
      const unknownOeuvres = this.searchUnkownOeuvreIn(item.definition);
      if ( unknownOeuvres.length ) {
        errors.push(`œuvres introuvables, dans la définition (${unknownOeuvres.join(', ')})`);
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
    
    // Si les catégories sont définies, il faut qu'elles existent
    // Rappel : Une "catégorie", c'est simplement l'ID d'une entrée
    // (c'est la particularité du dictionnaire, mais ça tombe sous le
    // sens) 
    if (item.categorie_id !== '' && item.changeset.has('categorie_id')) {
      const unknownCategorie = this.checkUnknownCategoriesIn(item.categorie_id);
      if ( unknownCategorie.length ) {
        errors.push(`des catégories sont inconnues : ${unknownCategorie.join(', ')}`);
      }
    }
    if ( errors.length ) {
      console.error("Données invalides", errors);
      return errors.join(', ').toLowerCase();
    }
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
  searchUnkownOeuvreIn(str: string): string[]{
    return ["oeuvres à checker"];
  }
  searchUnknownExempleIn(str: string): string[]{
    return ["Les exemples sont à checker"];
  }
  // @return la liste des catégories inconnues
  checkUnknownCategoriesIn(str: string): string[] {
    const cats = str.split(',').map(s => s.trim());
    // return cats.filter(Entry.doesIdExist.bind(Entry));
    return cats.filter(cat => false === Entry.doesIdExist(cat));
  }
  async onSave(item: Entry){
    console.log("Je dois apprendre à sauver l'entrée", item);
    console.log("Je dois apprendre à updater l'item (plutôt en méthode générale ?)");
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