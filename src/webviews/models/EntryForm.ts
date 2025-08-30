import { FormManager, FormProperty } from "../services/FormManager";
import { Entry } from "./Entry";

class FEntry extends Entry {
  [x:string]: any;
}

export class EntryForm extends FormManager<typeof Entry, FEntry> {
  formId = 'entry-form';
  prefix = 'entry';
  properties: FormProperty[] = [
    {propName: 'entree', type: String, required: true, fieldType: 'text'},
    {propName: 'genre', type: String, required: true, fieldType: 'select', values: [['nf'], ['nm'], ['vb']]},
    {propName: 'categorie_id', type: String, required: false, fieldType: 'text'}
  ];
  onSave(item: Entry){
    console.log("Je dois apprendre à sauver l'entrée", item);
    return true; // quand ça a été bien enregistré
  }
}