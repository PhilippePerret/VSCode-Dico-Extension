import { stopEvent } from "../services/DomUtils";
import { FormManager, FormProperty } from "../services/FormManager";
import { Oeuvre } from "./Oeuvre";

class FOeuvre extends Oeuvre {
  [x: string]: any;
}

export class OeuvreForm extends FormManager<typeof Oeuvre, FOeuvre> {
  prefix = 'oeuvre';
  formId = 'oeuvre-form';
  properties: FormProperty[] = [
    {propName: 'titre_affiche', type: String, required: true, fieldType: 'text', onChange: this.onChangeTitreAffiched.bind(this)},
    {propName: 'titre_original', type: String, required: true, fieldType: 'text'},
    {propName: 'titre_francais', type: String, required: false, fieldType: 'text'},
    {propName: 'id', type: String, required: true, fieldType: 'text'},
    {propName: 'auteurs', type: String, required: true, fieldType: 'text'},
    {propName: 'resume', type: String, required: false, fieldType: 'textarea'},
    {propName: 'notes', type: String, required: false, fieldType: 'textarea'}
  ];

  static readonly REG_AUTEUR = /([^ ]+) ([^\[])\[(H|F)\]/;

  onChangeTitreAffiched(){
    const itemIsNew = this.getValueOf('id') === '';
    if (itemIsNew) {
      console.log("Nouvelle œuvre à renseigner.");
    }
    const noTitreOriginal = this.getValueOf('titre_original') === '';
    if (noTitreOriginal) {
      console.log("Il faut essayer de définir le titre original d'après le titre affiché.");
    }

    if ( itemIsNew && noTitreOriginal) {
      console.log("Il faut que je demande s'il faut rechercher les information du film sur TMDB");
    }
  }

  afterEdit(): void {
    const id = this.getValueOf('id');
    const isNew = id === '';
    this.setIdLock(!isNew);
  }

  async onSave(item: Oeuvre): Promise<boolean> {
    console.log("Il faut que j'apprendre à sauver : ", item);
    return true;
  }

  async checkItem(item: Oeuvre): Promise<string | undefined> {
    console.error("Il faut apprendre à checker l'oeuvre");
    return 'Les données ne sont pas checkés';
  }

  observeForm(): void {
    // TODO
  }

}