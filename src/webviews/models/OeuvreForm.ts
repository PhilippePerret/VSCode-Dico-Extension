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
  async onSave(item: Oeuvre): Promise<boolean> {
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