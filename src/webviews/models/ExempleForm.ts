import { DBExempleType, ExempleType } from "../../bothside/types";
import { FormManager, FormProperty } from "../services/FormManager";
import { Exemple } from "./Exemple";

export class ExempleForm extends FormManager<ExempleType, DBExempleType> {
  formId = 'exemple-form';
  prefix = 'exemple';
  properties: FormProperty[] = [
  ];
  // Table des raccourcis 'one key' propre au formulaire
  tableKeys = {
    // <touche>: <fonction bindée>, par exemple
    // 'i': this.showInfo.bind(this)
  };



  async checkEditedItem(): Promise<string | undefined> {
    return 'Les données ne sont pas checkés';
  }

  async onSaveEditedItem(data2save: DBExempleType): Promise<boolean> {
    console.log("Il faut que j'apprendre à sauver l'exemple : ", this.editedItem);
    console.log("Données à sauver", data2save);
    return true;
  }

  observeForm(): void {
    // TODO
  }

  afterEdit(): void {
    // TODO
  }
}