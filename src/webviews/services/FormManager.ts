import { PanelClient } from "../PanelClient";

// Type pour la définition d'une propriété
export interface FormProperty {
  propName: string;
  type: typeof String | typeof Number | typeof Boolean;
  required: boolean;
  fieldType: 'text' | 'select' | 'textarea' | 'checkbox' | 'radio';
  field?: any; // renseigné à la vérificatiaon
  values?: string[][];
  default?: any;
}

interface ConcreteElement {
  data: { [k: string]: any}
  [k: string]: any; 
} 

type FieldType = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export abstract class FormManager<C, T extends ConcreteElement> {

  abstract formId: string; // Identifiant unique du formulaire
  abstract prefix: string; // utilisé pour nommer les champs
  abstract properties: FormProperty[];
  abstract afterEdit(): void; // à faire après l'édition d'un élément
  abstract onSave(item: T): boolean; // Fonction pour sauver (appelée quand on sauve la donnée)
  onCancel?(): void; // Fonction appelée en cas d'annulation
  abstract observeForm(): void; // fonction d'observation propre du formulaire
  onFocusForm?(ev: FocusEvent): any;
  private panel?: PanelClient<any, any>; // le panneau contenant le formulaire

  // L'item qui sera travaillé ici, pour ne pas toucher l'item original
  fakeItem?: any;

  private checked: boolean = false;

  private _obj!: HTMLFormElement; // le formulaire complet
  get obj(){
    return this._obj || (this._obj = document.querySelector(`form#${this.formId}`) as HTMLFormElement);
  }

  /**
   * API
   * Point d'entrée de l'édition, on envoi l'item à éditer. La manager
   * affiche ses données et affiche le formulaire.
   * 
   * @param item Objet Entry, Oeuvre ou Exemple à éditer/créer
   */
  editItem(item: T): void {
    // console.log("Édition de l'item", item);
    this.openForm();
    this.dispatchValues(item.data);
    if ( 'function' === typeof this.afterEdit ) { this.afterEdit.call(this); }
  }

  // Met les données dans le formulaire
  dispatchValues(data: {[x: string]: any}){
    this.reset();
    this.properties.forEach( dprop => {
      const prop = dprop.propName;
      if ( data[prop] ) { 
        console.log("Propriété %s mise à %s", prop, data[prop]);
        dprop.field.value = String(data[prop]);
      } else {
        console.log("La valeur de la propriété %s n'est pas définie dans ", prop, data);
      }
    });
  }

  // Retourne le champ de la propriété +prop+
  // (note : ces champs ont été vérifiés au début)
  field(prop: string): FieldType {
    if ( false === this.domCache.has(prop)) {
      const sel = `#${this.prefix}-${prop}`;
      const fld = this.obj.querySelector(sel) as FieldType;
      fld || console.error("Bizarrement, le champ %s est introuvable (%s)", sel, prop);
      this.domCache.set(prop, fld);
    }
    return this.domCache.get(prop) as FieldType;
  }
  domCache: Map<string, HTMLElement> = new Map();

  // Récupère les données dans le formulaire et retourne l'item
  // avec ses nouvelles données.
  collectValues() {
    this.fakeItem = {};
    this.properties.forEach( dprop => {
      const prop = dprop.propName;
      const value = this.getValueOf(dprop);
      Object.assign(this.fakeItem, {[prop]: value});
    });
    return this.fakeItem;
  }

  getValueOf(property: FormProperty): string | number | boolean | null {
    const prop = property.propName;
    const field = this.field(prop);
    // Récupérer la valeur dans le formulaire (en fonction du champ)
    let value: any = ((ft) => {
      switch (ft) {
        case 'checkbox': return (field as HTMLInputElement).checked;
        case 'radio': return (field as HTMLInputElement).checked;
        default: return field.value;
      }
    })(property.fieldType);
    // TODO Traiter la valeur en fonction de son type
    return value ;
  }

  openForm(){
    this.checked || this.checkFormManagerValidity();
    if (this.checked === false) { return; }
    this.obj.classList.remove('hidden'); 
  }
  closeForm(){ this.obj.classList.add('hidden'); }
  
  // Tout remettre à rien (vider les champs)
  reset(){
    this.properties.forEach(dprop => {
      switch(dprop.fieldType) {
        case 'checkbox':
          dprop.field.checked = dprop.default || false;
          break;
        case 'textarea':
          dprop.field.value = '';
        default: 
          dprop.field.value = dprop.default || '';
      }
    });
  }

  // Méthode appelée quand on sauve l'élément. Soit c'est une
  // édition, soit c'est une création
  onSaveElement(){
    console.log("Je dois apprendre à sauver ou créer l'élément.");
  }
  __onSave(){
    this.collectValues();
    this.onSave(this.fakeItem);
  }
  __onSaveAndQuit(){
    this.__onSave();
    this.closeForm();
  }
  __onCancel(){
    this.closeForm();
  }
  __onFocusOnForm(ev: FocusEvent) {
    if ('function' === typeof this.onFocusForm) { this.onFocusForm.call(this, ev); }
    (this.panel as PanelClient<any, any>).keyManager.setMode('form');
  }
  public setPanel(panel: PanelClient<any, any>) {
    this.panel = panel;
  }
  // === MÉTHODES DE VALIDATION DES DONNÉES D'IMPLÉMENTATION ===
  // (les données suivantes s'assurent que le formulaire est
  //  conforme aux attentes)
  // La méthode sert aussi à observer les éléments
  checkFormManagerValidity(){
    if ( ! this.obj ) {
      console.error('Le formulaire form#%s est introuvable.', this.formId);
      return false;
    }
   /**
     * Check de la conformité des boutons et leurs méthodes
     */
    if (false === this.checkBoutonsValidity()) { return false; }
     /**
     * Observation des boutons principaux
     */
    this.observeButtons();
    /**
     * Check de la conformité des propriétés, on en profite aussi
     * pour définir des valeurs (container, erreur, etc.)
     */
    if ( false === this.checkPropertiesValidity() ) { return false ; }

    console.info("Formulaire %s valide.", this.formId);

    /**
     * Observation propre de chaque formulaire (la fonction est 
     * impérativement implémenté)
     */
    this.__observeForm();
    this.observeForm();

    this.checked = true;
  }
  checkBoutonsValidity(): boolean {
    let ok = true;
    if ( this.btnSave ) {
      if ( 'function' !== typeof this.onSave) {
        console.error('Il faut définir la méthode onSave(item): boolean');
      }
    } else {
      console.error("Le formulaire devrait contenir un bouton de class btn-save.");
      ok = false;
    }
    if ( ! this.btnCancel) {
      console.error('Le formulaire doit contenir un bouton pour annuler (class "btn-cancel")');
    }
    return ok;
  }
  // Observation du formulaire
  __observeForm() { 
    // De façon générale, quand on focus dans le formulaire, on
    // active soit le mode FORM soit le mode EDIT
    this.obj.addEventListener('focusin', this.__onFocusOnForm.bind(this));
    // On règle le changement de mode suivant qu'on focusse dans un
    // champ éditable ou qu'on en blure
    (this.panel as PanelClient<any, any>).keyManager.discrimineFieldsForModeIn(this.obj, {edit: 'edit', normal: 'form'});
  }
  // Observation des boutons principaux
  observeButtons(){
    this.btnSave.addEventListener('click', this.__onSave.bind(this));
    this.btnCancel.addEventListener('click', this.__onCancel.bind(this));
    this.btnSaveNQuit && this.btnSaveNQuit.addEventListener('click', this.__onSaveAndQuit.bind(this));
  }
  get btnSave(){return this.obj.querySelector('button.btn-save') as HTMLButtonElement;}
  get btnCancel(){return this.obj.querySelector('button.btn-cancel') as HTMLButtonElement;}
  get btnSaveNQuit(){return this.obj.querySelector('button.btn-save-and-quit') as HTMLButtonElement;}

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
      let propField = this.obj.querySelector(fieldSelector);
      if ( propField ) {
        switch(dproperty.fieldType) {
          case 'checkbox': propField = propField as HTMLInputElement; break;
          case 'textarea': propField = propField as HTMLTextAreaElement; break;
          default: propField = propField as HTMLInputElement;
        }
        Object.assign(dproperty, { field: propField });
      } else {
        console.error('Le champ %s pour la propriété %s devrait exister.', fieldSelector, prop);
        ok = false;
      }
      // Un champ select doit avoir des valeurs
      // Et on en profite pour les mettre
      if ( dproperty.fieldType === 'select' ) {
        if ( dproperty.values ) {
          const field = dproperty.field;
          field.innerHTML = '';
          dproperty.values.forEach( paire => {
            let [value, title] = paire;
            title = title || value;
            const opt = document.createElement('option');
            opt.value = value;
            opt.innerHTML = title;
            field.appendChild(opt);
          });
        } else {
          console.error('Le champ %s, de type select, devrait définir ses valeurs (values)', prop);
          ok = false;
        }
      }
      

    });
    
    return ok;
  }
}