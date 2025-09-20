import { DBExempleType, ExempleType } from "../../bothside/types";
import { FormManager, FormProperty } from "../services/FormManager";


export class ExempleForm extends FormManager<ExempleType, DBExempleType> {
  formId = 'exemple-form';
  prefix = 'exemple';
  properties: FormProperty[] = [
    {propName: 'id', type: String, required: true, fieldType: 'text', locked: true},
    {propName: 'entry_id', type: String, required: true, fieldType: 'text'},
    {propName: 'oeuvre_id', type: String, required: true, fieldType: 'text'},
    {propName: 'content', type: String, required: true, fieldType: 'textarea'},
    {propName: 'notes', type: String, required: true, fieldType: 'textarea'},
  ];
  // Table des raccourcis 'one key' propre au formulaire
  tableKeys = {
    // <touche>: <fonction bindée>, par exemple
    // 'i': this.showInfo.bind(this)
  };


  /**
   * Grand méthode de check de l'item.
   * 
   * Pour un exemple, il suffit de vérifier que le contenu contienne
   * ce qu'il faut. Car les autres valeurs sont des identifiants qui
   * n'ont pas pu être forcés.
   * 
   * @returns undefined si la donnée est valide ou le string du message d'erreur dans le cas contraire.
   */
  async checkEditedItem(): Promise<string | undefined> {
    return 'Les données ne sont pas checkés';
  }

  /**
   * Méthode pour enregistrer les données si elles ont été modifiées.
   * 
   * @param data2save Les données à sauvegarder
   * @returns True si tout s'est bien passé
   */
  async onSaveEditedItem(data2save: DBExempleType): Promise<boolean> {
    console.log("Il faut que j'apprendre à sauver l'exemple : ", this.editedItem);
    console.log("Données à sauver", data2save);
    return true;
  }

  // Pour observer le formulaire
  observeForm(): void {
    // TODO
  }

  // Ce qu'il faut faire juste après l'édition de l'exemple
  afterEdit(): void {
    // TODO
  }

  setEntry(entryId: string, entryEntree: string){
    this.setValueOf('entry_id', entryId);
    (this.obj.querySelector('span#exemple-entry-explicit') as HTMLElement).innerText = entryEntree;
  }
  setOeuvre(oeuvreId: string, oeuvreTitre: string){
    this.setValueOf('oeuvre_id', oeuvreId);
    (this.obj.querySelector('span#exemple-oeuvre-explicit') as HTMLElement).innerText = oeuvreTitre;
  }
}