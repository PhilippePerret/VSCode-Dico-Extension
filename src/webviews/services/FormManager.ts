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
  abstract prefix: string; // utilisé pour nommer les champs
  abstract properties: FormProperty[];

  private checked: boolean = false;

  private _obj!: HTMLFormElement; // le formulaire complet
  get obj(){
    return this._obj || (this._obj = document.querySelector(`form#${this.formId}`) as HTMLFormElement);
  }

  constructor(){
    // console.info("Id du formulaire : %s", this.formId);
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

  openForm(){
    this.checked || this.checkFormManagerValidity();
    if (this.checked === false) { return; }
    this.form.classList.remove('hidden'); 
  }
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
    if ( ! this.obj ) {
      console.error('Le formulaire form#%s est introuvable.', this.formId);
      return false;
    }
    /**
     * Check de la conformité des propriétés, on en profite aussi
     * pour définir des valeurs (container, erreur, etc.)
     */
    if ( false === this.checkPropertiesValidity() ) { return false ; }


    console.info("Formulaire %s valide.", this.formId);
    this.checked = true;
  }
  checkPropertiesValidity(): boolean {
    let ok = true ;
    this.properties.forEach( dproperty => {
      const prop = dproperty.propName;
      const prefix = this.prefix;
      const prefprop = `${prefix}-${prop}`;
      // Chaque propriété doit avoir son conteneur de nom '<propName>-container'
      const container = this.obj.querySelector(`#${prefprop}-container`);
      if ( container ) {
        Object.assign(dproperty, {container: container});
      } else {
        console.error('La propriété "%s" devrait être dans un conteneur d’identifiant "#%s-container"', prop, prefprop);
        ok = false;
      }
      // Est-ce que chaque propriété est bien dans son champ ?
      let propTag = String(dproperty.fieldType);
      if ( ['text', 'checkbox', 'radio'].includes(propTag)) { propTag = 'input';}
      const fieldSelector = `${propTag}#${prefprop}`;
      const propField = this.obj.querySelector(fieldSelector);
      if ( propField ) {
        Object.assign(dproperty, { field: propField });
      } else {
        console.error('Le champ %s pour la propriété %s devrait exister.', fieldSelector, prop);
        ok = false;
      }
      // Un champ select doit avoir des valeurs
      if ( dproperty.fieldType === 'select' ) {
        if ( ! dproperty.values ) {
          console.error('Le champ %s, de type select, devrait définir ses valeurs (values)', prop);
          ok = false;
        }
      }
      

    });
    
    return ok;
  }
}