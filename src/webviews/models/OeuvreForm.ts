import { FormManager, FormProperty } from "../services/FormManager";
import { Oeuvre } from "./Oeuvre";


export class OeuvreForm extends FormManager<typeof Oeuvre, Oeuvre> {
  prefix = 'oeuvre';
  formId = 'oeuvre-form';
  properties: FormProperty[] = [
  ];
}