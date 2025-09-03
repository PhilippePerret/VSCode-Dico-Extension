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

  checkItem(item: Oeuvre): string | undefined {
    return 'Les données ne sont pas checkés';
  }

  observeForm(): void {
    // TODO
  }

  afterEdit(): void {
    // TODO
  }
}