import { AnyElementType } from "../models/AnyClientElement";

export interface FormProperty {
  propName: string;
  type: typeof String | typeof Number | typeof Boolean;
  required: boolean;
  fieldType: 'text' | 'select' | 'textarea' | 'checkbox';
  values?: [][];
}
export abstract class FormManager<C, T extends AnyElementType> {

  abstract formId: string; // Identifiant unique du formulaire
  abstract properties: FormProperty[];

  private _obj!: HTMLFormElement; // le formulaire complet
  get obj(){
    return this._obj || (this._obj = document.querySelector(`form#${this.formId}`) as HTMLFormElement);
  }

  constructor(){
    this.checkFormManagerValidity();
  }
  /**
   * API
   * Point d'entrée de l'édition, on envoi l'item à éditer. La manager
   * affiche ses données et affiche le formulaire.
   * 
   * @param item Objet Entry, Oeuvre ou Exemple à éditer/créer
   */
  editItem(item: T): void {

    console.log("Je dois apprendre à éditer ou créer un élément.");
    this.openForm();
    this.setData(item);
  }

  // Met les données dans le formulaire
  setData(item: T){
    this.properties.forEach( dprop => {
      
    });
  }
  // Récupère les données dans le formulaire et retourne l'item
  // avec ses nouvelles données.
  getData(item: T): T {
    this.properties.forEach( dprop => {
      const prop = dprop.propName;
      const value = this.getValueOf(dprop);
      Object.assign(item, {[prop]: value});
    });
 
    return item;
  }

  getValueOf(property: FormProperty): string | number | boolean | null {
    let value = null;
    // TODO Récupérer la valeur dans le formulaire
    // TODO Traiter la valeur en fonction de son type
    return value ;
  }

  openForm(){this.form.classList.remove('hidden'); }
  closeForm(){ this.form.classList.add('hidden'); }
  
  // Tout remettre à rien (vider les champs)
  reset(){

  }

  // Méthode appelée quand on sauve l'élément. Soit c'est une
  // édition, soit c'est une création
  onSaveElement(){
    console.log("Je dois apprendre à sauver ou créer l'élément.");
  }
  onCancel(){
    this.closeForm();
  }
  get form(){
    return document.querySelector('form#edit-form') as HTMLFormElement;
  }

  // === MÉTHODES DE VALIDATION DES DONNÉES D'IMPLÉMENTATION ===
  // (les données suivantes s'assurent que le formulaire est
  //  conforme aux attentes)
  checkFormManagerValidity(){
    this.obj || console.warn('Le formulaire form#%s est introuvable.', this.formId);
    /**
     * Check de la conformité des propriétés, on en profite aussi
     * pour définir des valeurs (container, erreur, etc.)
     */
    this.checkPropertiesValidity();
  }
  checkPropertiesValidity(): boolean {
    this.properties.forEach( dproperty => {
      const prop = dproperty.propName;
      // Chaque propriété doit avoir son conteneur de nom '<propName>-container'
      const container = this.obj.querySelector(`${prop}-container`);
      if ( container ) {
        Object.assign(dproperty, {container: container});
      } else {
        console.warn('La propriété "%s" devrait être dans un conteneur d’identifiant "%s-container"', prop, prop);
      }
      // Est-ce que chaque propriété est bien dans son champ ?
      let propTag = String(dproperty.fieldType);
      if ( ['text', 'checkbox', 'radio'].includes(propTag)) { propTag = 'input';}
      const fieldSelector = `${propTag}#prop-${prop}`;
      const propField = this.obj.querySelector(fieldSelector);
      if ( propField ) {
        Object.assign(dproperty, { field: propField });
      } else {
        console.warn('Le champ %s pour la propriété %s devrait exister.', fieldSelector, prop);
      }
      // Un champ select doit avoir des valeurs
      if ( dproperty.fieldType === 'select' ) {
        dproperty.values || console.warn('Le champ %s, de type select, devrait définir ses valeurs (values)', prop);
      }
      

    });
    
    return true ;
  }
}