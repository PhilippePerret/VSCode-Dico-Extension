import { FormManager, FormProperty } from "../services/FormManager";
import { Entry } from "./Entry";


export class EntryForm extends FormManager<typeof Entry, Entry> {
  formId = 'entry-form';
  prefix = 'entry';
  properties: FormProperty[] = [
    {propName: 'entree', type: String, required: true, fieldType: 'text'},
    {propName: 'genre', type: String, required: true, fieldType: 'select'},
    {propName: 'categorie_id', type: String, required: false, fieldType: 'select'}
  ];
}