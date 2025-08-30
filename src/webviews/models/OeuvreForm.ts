import { FormManager, FormProperty } from "../services/FormManager";
import { Oeuvre } from "./Oeuvre";

class FOeuvre extends Oeuvre {
  [x: string]: any;
}

export class OeuvreForm extends FormManager<typeof Oeuvre, FOeuvre> {
  prefix = 'oeuvre';
  formId = 'oeuvre-form';
  properties: FormProperty[] = [
  ];
  onSave(item: Oeuvre): boolean {
    console.log("Il faut que j'apprendre à sauver : ", item);
    return true;
  }

  observeForm(): void {
    // TODO
  }

  afterEdit(): void {
    // TODO
  }
}