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

  checkItem(item: Entry): string | null {
    // TODO L'entrée doit être définie
    // TODO L'entrée doit être unique
    // TODO L'identifiant doit être défini
    // TODO L'identifiant doit être unique (si nouveau)
    // TODO La définition doit être donnée
    // TODO Le genre doit être donné
    // TODO Si la catégorie existe, elle doit exister
    return 'Les données ne sont pas checkés';
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