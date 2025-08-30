import { FormManager, FormProperty } from "../services/FormManager";
import { Exemple } from "./Exemple";


export class ExempleForm extends FormManager<typeof Exemple, Exemple> {
  formId = 'exemple-form';
  prefix = 'exemple';
  properties: FormProperty[] = [
  ];
}