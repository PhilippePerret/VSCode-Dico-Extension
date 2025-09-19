import { ExempleType } from "../../bothside/types";
import { FormManager, FormProperty } from "../services/FormManager";
import { Exemple } from "./Exemple";

export class ExempleForm extends FormManager<ExempleType> {
  formId = 'exemple-form';
  prefix = 'exemple';
  properties: FormProperty[] = [
  ];
  // Table des raccourcis 'one key' propre au formulaire
  tableKeys = {
    // <touche>: <fonction bindée>, par exemple
    // 'i': this.showInfo.bind(this)
  };



  async checkItem(item: ExempleType): Promise<string | undefined> {
    return 'Les données ne sont pas checkés';
  }

  async onSave(item: ExempleType): Promise<boolean> {
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