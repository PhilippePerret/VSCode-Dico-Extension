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

  onChangeEntree() {
    console.log("Le champ Entrée a changé");
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

  checkItem(item: {[x:string]: any}): string | null {
    const isNew = item.isNew ; // TODO <==== LE PROGRAMMER (CHECKER QUAND ON DONNE LES DONNÉES, MAIS VOIR POUR L'EXEMPLE, QUI N'A PAS DE PROPRIÉTÉ ID — voir si elle n'est pas ajoutée, en fait)
    const errors: string[] = [];
    // TODO L'entrée doit être définie
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
    // La définition doit être donnée
    if ( item.definition === ''){
      errors.push("La définition du mot doit être donnée");
    } else if (item.changeset.has('definition')) {
      const unknownEntries = this.searchUnknownEntriesIn(item.definition);
      if ( unknownEntries.length > 0) {
        errors.push(`entrées inconnues dans la défintion (${unknownEntries.join(', ')})`);
      }
    }
    // Le genre doit être donné
    item.genre === '' || errors.push("Le genre de l'entrée doit être donné");
    
    // TODO Si la catégorie existe, elle doit exister
    if (item.categorie_id !== '' && item.changeset.has('categorie_id')) {
      const unknownCategorie = this.checkUnknownCategoriesIn(item.categorie_id);
      if ( unknownCategorie.length ) {
        errors.push(`des catégories sont inconnues : ${unknownCategorie.join(', ')}`);
      }
    }
    if ( errors.length === 0 ) {
      return null;
    } else {
      console.error("Données invalides", errors);
      return errors.join(', ').toLowerCase();
    }
  }

  // Pour chercher les entrées mentionnées dans la définition
  searchUnknownEntriesIn(str: string): string[] {
    return ['entrée à chercher'];
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