import { FormManager, FormProperty } from "../services/FormManager";
import { Exemple } from "./Exemple";

class FExemple extends Exemple {
  [x: string]: any;
}

export class ExempleForm extends FormManager<typeof Exemple, FExemple> {
  formId = 'exemple-form';
  prefix = 'exemple';
  properties: FormProperty[] = [
  ];
  // Table des raccourcis 'one key' propre au formulaire
  tableKeys = {
    // <touche>: <fonction bindée>, par exemple
    // 'i': this.showInfo.bind(this)
  };



  async checkItem(item: Exemple): Promise<string | undefined> {
    return 'Les données ne sont pas checkés';
  }

  async onSave(item: Exemple): Promise<boolean> {
    console.log("Il faut que j'apprendre à sauver l'exemple : ", item);
    return true;
  }

  observeForm(): void {
    // TODO
  }

  afterEdit(): void {
    // TODO
  }
}