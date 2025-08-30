import { Constants } from '../../bothside/UConstants';
import { FormManager, FormProperty } from "../services/FormManager";
import { Entry } from "./Entry";

class FEntry extends Entry {
  [x:string]: any;
}
const allg: {[x: string]: string} = Constants.ENTRIES_GENRES;
const genres = Object.keys(allg).map( key => [key, allg[key]] );

export class EntryForm extends FormManager<typeof Entry, FEntry> {
  formId = 'entry-form';
  prefix = 'entry';
  properties: FormProperty[] = [
    {propName: 'id', type: String, required: true, fieldType: 'text'},
    {propName: 'entree', type: String, required: true, fieldType: 'text'},
    {propName: 'genre', type: String, required: true, fieldType: 'select', values: genres},
    {propName: 'categorie_id', type: String, required: false, fieldType: 'text'},
    {propName: 'definition', type: String, required: false, fieldType: 'textarea'}
  ];
  onSave(item: Entry){
    console.log("Je dois apprendre à sauver l'entrée", item);
    return true; // quand ça a été bien enregistré
  }
}