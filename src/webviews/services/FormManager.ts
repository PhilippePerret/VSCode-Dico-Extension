import { PanelClient } from "../PanelClient";
import { EntryType, OeuvreType, ExempleType, AnyDbType, AnyItemType, DBEntryType, DBOeuvreType, DBExempleType } from "../../bothside/types";

// Type pour la définition d'une propriété
export interface FormProperty {
  propName: string;
  type: typeof String | typeof Number | typeof Boolean;
  required: boolean;
  no_shortcut?: boolean;
  fieldType: 'text' | 'select' | 'textarea' | 'checkbox' | 'radio';
  field?: any; // renseigné à la vérificatiaon
  values?: string[][];
  default?: any;
  locked?: boolean; // si true, le champ est verrouillé
  onChange?(): void; // la fonction optionnelle à appeler en cas de changement de cette propriété
}

type FieldType = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface ChangeSetType {
  [x: string]: any;
  isNew: boolean;
  size: number;
}

interface EditedEntryType /* pour "Type de l'item édité */ extends DBEntryType {
  // Pour mettre les changements effectués
  changeset: ChangeSetType;
  // Pour mettre les données initiales de l'item
  original: DBEntryType;
  data2save?: DBEntryType;
}
interface EditedOeuvreType extends DBOeuvreType {
  changeset : ChangeSetType;
  original: DBOeuvreType;
  data2save?: DBOeuvreType;
}
interface EditedExempleType extends DBExempleType {
  changeset: ChangeSetType;
  original: DBExempleType;
  data2save?: DBExempleType;
}
type EditedIType = EditedEntryType | EditedOeuvreType | EditedExempleType; 

/**
 * Classe pour étendre le formulaire de chaque élément
 */

export abstract class FormManager<T extends AnyItemType, Tdb extends AnyDbType> {

  abstract formId: string; // Identifiant unique du formulaire
  abstract prefix: string; // utilisé pour nommer les champs
  abstract properties: FormProperty[];
  abstract tableKeys: Record<string, {lab: string, fn: Function}>; // table des raccourcis propres
  private tablePropertiesByPropName!: Map<string, FormProperty>;
  abstract afterEdit(): void; // à faire après l'édition d'un élément
  abstract onSaveEditedItem(data: Tdb): Promise<boolean>; // Fonction pour sauver (appelée quand on sauve la donnée)
  async checkEditedItem(): Promise<string | undefined> { return undefined ; }; // Pour checker les données 
  onCancel?(): void; // Fonction appelée en cas d'annulation
  abstract observeForm(): void; // fonction d'observation propre du formulaire
  onFocusForm?(ev: FocusEvent | undefined): any;
  public panel!: PanelClient<AnyItemType>; // le panneau contenant le formulaire
  public saving: boolean = false;
  // Les propriétés à retirer des données à finalement sauver.
  // Note: les propriétés isNew et size sont déjà traitées
  /* surclasser (if any) */ propsToRemove(): string[] {return [];}

  // Pour savoir si une édition est en cours
  // if this.form.isActive()
  public isActive(){
    return !this.obj.classList.contains('hidden');
  }
 
  // Maintenant c'est celui-ci
  protected editedItem!: EditedIType | undefined;
  public getEditedItem(){ return this.editedItem;}

  private checked: boolean = false;

  private _obj!: HTMLFormElement; // le formulaire complet
  get obj(){
    return this._obj || (this._obj = document.querySelector(`form#${this.formId}`) as HTMLFormElement);
  }

  // raccourci
  private setMode(mode: 'form' | 'edit' | 'normal') {
    this.panel.keyManager.setMode(mode);
  }
  /**
   * @api
   * Point d'entrée de l'édition, on envoi l'item à éditer. La manager
   * affiche ses données et affiche le formulaire.
   * 
   * @param item Objet Entry, Oeuvre ou Exemple à éditer/créer
   */
  public editItem(item: T): void {
    // console.log("Édition de l'item", item);
    const isNewItem = item.id === '';
    this.panel.context = isNewItem ? 'create-element' : 'edit-element';
    const originalData: Tdb = isNewItem ? {} as Tdb : structuredClone(item.dbData) as Tdb;
    this.editedItem /* EditedIType */ = Object.assign(originalData, {
      original: structuredClone(originalData),
      changeset: {size: 0, isNew: isNewItem}
    }) as any as EditedIType;
    this.openForm();
    this.dispatchValues(item);
    if ( 'function' === typeof this.afterEdit ) { this.afterEdit.call(this); }
    this.setMode('form');
  }

  public async saveItem(andQuit: boolean): Promise<void> {
    const res = await this.itemIsNotSavable();
    if (res) { return ;}
    if ( this.editedItem){
      let data2save = structuredClone(this.editedItem.changeset) as any as Tdb;
      this.editedItem.data2save = data2save;
    }
    const map = new Map();
    map.set('o', this.onConfirmSave.bind(this, andQuit));
    map.set('n', this.cancelEdit.bind(this));
    this.panel.flashAction(
      "<b>👍 Donnée validée 🎉</b><br />Confirmes-tu la sauvegarde ? (o = oui, n = non)", map
    );
  }

  private async itemIsNotSavable(): Promise<boolean> {
    this.panel.cleanFlash();
    this.collectValues(); // maintenant les met dans this.editedItem
    const item = this.editedItem as Record<string, any>;
    this.properties.forEach(dproperty => {
      const prop = dproperty.propName;
      // console.log("Propriété '%s' | Original: '%s' | New: '%s'", prop, item.original[prop], item[prop]);
      if ( item[prop] !== item.original[prop] && this.editedItem) {
        Object.assign(this.editedItem.changeset, {
          [prop]: item[prop],
          size: ++item.changeset.size
        });
      }
    });
    console.log("Item à enregistrer", this.editedItem);
    if ( this.itemIsEmpty()) {
      this.panel.flash("Aucune donnée n'a été founie…", 'error');
      return true;
    } 
    if (this.editedItem && this.editedItem.changeset.size === 0 ) {
      this.panel.flash("Les données n'ont pas changé…", 'warn');
      return true;
    }
    let invalidity: string | undefined = await this.checkEditedItem();
    console.log("=== FIN DU CHECK DE L'ITEM ===");
    if (invalidity) {
      this.panel.flash("Les données sont invalides : " + invalidity, 'error');
      return true;
    }
    return false; // enregistrable
  }

  /**
   * Méthode appelée après confirmation de la sauvegarde.
   * 
   * Elle finalise la donnée finale à enregistrer, notamment en 
   * retirant les propriétés non persistantes.
   */
  public async onConfirmSave(andQuit: boolean): Promise<void> {
    // console.log("Sauvegarde confirmée");
    const fakeItem = this.collectValues();
    // Données persistantes
    if (this.editedItem) {
      const data2save: Tdb = structuredClone(this.editedItem.original) as Tdb;
      Object.assign(data2save, this.editedItem.data2save);
      // Données particulières à retirer
      const removedProps = ['isNew', 'size'];
      removedProps.push(...this.propsToRemove());
      // console.log("Propriétés à remover", removedProps);
      const data2saveEpured = {};
      for (var k in data2save) {
        if (removedProps.includes(k)) { continue; }
        Object.assign(data2saveEpured, { [k]: data2save[k] });
      }
      console.log("Données FINALES à sauvegarder", structuredClone(data2saveEpured));
      await this.onSaveEditedItem(data2saveEpured as Tdb);
    }
    this.saving = false;
    if (andQuit) { this.closeForm(); }
  }

  private itemIsEmpty(): boolean {
    var isEmpty = true;
    const item = this.editedItem as Record<string, any>;
    this.properties.forEach(dprop => {
      if (!isEmpty) { return ;}
      if ( item[dprop.propName] !== '' ) { isEmpty = false; }
    });
    return isEmpty;
  }

  public cancelEdit(): void {
    // console.log("Cancel édition");
    this.saving = false;
    this.__onCancel();
  }

  // Met les données dans le formulaire
  dispatchValues(item: T){
    this.reset();
    const itemVals = item as {[x: string]: any};
    this.properties.forEach( dprop => {
      const prop = dprop.propName;
      const value = itemVals.dbData && (itemVals.dbData[prop] || itemVals.cachedData[prop]);
      if ( value ) { 
        // console.log("Propriété %s mise à %s", prop, data[prop]);
        this.setValueOf(prop, String(value));
        // Si le champ doit être verrouillé
        if (dprop.locked) { dprop.field.disabled = true; }
      } else {
        console.log("La valeur de la propriété %s n'est pas définie dans ", prop, item);
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
    if (this.editedItem) {
      this.properties.forEach(dprop => {
        const prop = dprop.propName;
        const value = this.getValueOf(dprop);
        this.editedItem && Object.assign(this.editedItem, { [prop]: value });
      });
    }
  }

  /**
   * Pendant de la précédente, donne la valeur +value+ à la propriété
   * +property+
   */
  setValueOf(property: string, value: any) {
    const propData = this.tablePropertiesByPropName.get(property) as FormProperty;
    switch (propData.fieldType) {
      case 'checkbox':
      case 'radio':
        propData.field.checked = value;
        break;
      default:
        propData.field.value = value;
    }
  }
  /**
   * Retourne la valeur de la propriété +foo+
   * 
   * @param foo Nom de la propriété dont il faut retourne la valeur
   * @returns Retourne la valeur de la propriété en fonction de son type
   */
  getValueOf(foo: string | FormProperty): string | number | boolean | null {
    if ( 'string' === typeof foo ) {
      return this.getValueOfByPropName(foo);
    } else {
      return this.getValueOfByPropData(foo);
    }
  }

  getValueOfByPropName(propName: string) {
    const propData = this.tablePropertiesByPropName.get(propName) as FormProperty;
    return this.getValueOfByPropData(propData);
  }
  getValueOfByPropData(property: FormProperty): string | number | boolean | null {
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
  closeForm(){ 
    this.obj.classList.add('hidden'); 
    this.setMode('normal');
    this.editedItem = undefined;
  }

 
  // Tout remettre à rien (vider les champs)
  reset(){
    this.properties.forEach(dprop => {
      switch(dprop.fieldType) {
        case 'checkbox':
          dprop.field.checked = dprop.default || false;
          break;
        case 'textarea':
          dprop.field.value = '';
          break;
        case 'select':
          dprop.field.selectedIndex = 0;
          break;
        default: 
          dprop.field.value = dprop.default || '';
      }
    });
  }

  async __onSaveEditedItem(){
    return this.saveItem(false);
  }
  async __onSaveEditedItemAndQuit(): Promise<void>{
    await this.saveItem(true);
  }
  __onCancel(){
    this.closeForm();
  }
  __onFocusOnForm(ev: FocusEvent | undefined) {
    if ('function' === typeof this.onFocusForm) { this.onFocusForm.call(this, ev); }
    (this.panel as PanelClient<AnyItemType>).keyManager.setMode('form');
  }

  public setPanel(panel: PanelClient<AnyItemType>) {
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
     * On inscrit les aides raccourcis clavier dans le footer
     */
    this.inscritAideInFooter();
     /**
     * Observation des boutons principaux
     */
    this.observeButtons();
    /**
     * Check de la conformité des propriétés, on en profite aussi
     * pour définir des valeurs (container, erreur, etc.)
     */
    if ( false === this.checkPropertiesValidity() ) { return false ; }

    // console.info("Formulaire %s valide.", this.formId);

    /**
     * Observation propre de chaque formulaire (la fonction est 
     * impérativement implémenté)
     */
    this.__observeForm();
    this.observeForm();

    this.checked = true;
  }
  inscritAideInFooter(){
    let aide = '<shortcut>q</shortcut><span>Renoncer</span><shortcut>s</shortcut><span>Enregistrer</span><shortcut>w</shortcut><span>Enregistrer et finir</span>';
    (this.obj.querySelector('div#footer') as HTMLElement).innerHTML = aide;
  }
  checkBoutonsValidity(): boolean {
    let ok = true;
    // Note : les boutons généraux (Save, Renoncer, etc. on été supprimés au profit des raccourcis clavier)
    return ok;
  }
  // Observation du formulaire
  __observeForm() { 
    // On sélectionne toujours le contenu d'un champ (sauf textarea)
    this.obj.querySelectorAll('text[type="text"]').forEach(o => {
      o.addEventListener('focus', (ev) => { (o as HTMLInputElement).select(); });
    });

    // On règle le changement de mode suivant qu'on focusse dans un
    // champ éditable ou qu'on en blure
    (this.panel as PanelClient<AnyItemType>).keyManager.discrimineFieldsForModeIn(this.obj, {edit: 'edit', normal: 'form'});
  }
  
  focusField(indice: number) {
    const dproperty = this.properties[indice - 1];
    let curIndice = 0;
    let foundProp: FormProperty | undefined = undefined;
    this.properties.forEach((dprop) => {
      if (foundProp) {return; /* accélérateur… */}
      if (dprop.no_shortcut) { return; }
      curIndice ++;
      if ( curIndice === indice) { foundProp = dprop; }
    });
    if (foundProp) { (foundProp as FormProperty).field.focus(); }
  }

  // S'il y a un champ d'identifiant, cette fonction permet de le déloquer
  toggleIdLock() {
    const idField = this.field('id');
    if (!idField) { return; }
    let isLocked = idField.dataset.state === 'locked';
    this.setIdLock(!isLocked);
  }
  setIdLock(isLocked: boolean) {
    const idField = this.field('id');
    idField.dataset.state = isLocked ? 'locked' : 'unlocked';
    idField.disabled = isLocked;
    const btn = this.obj.querySelector('.btn-lock-id');
    if (btn) { idField.innerHTML = isLocked ? '🔒' : '🔓'; }
  }
  // Observation des boutons principaux
  observeButtons(){
  }

  checkPropertiesValidity(): boolean {
    let ok = true ;
    const lettres = 'abcdefghijkl'.split('').reverse();
    // On va en profiter pour mettre les données des propriétés dans
    // une table pour les récupérer facilement
    this.tablePropertiesByPropName = new Map();

    this.properties.forEach( (dproperty) => {
      const prop = dproperty.propName;
      this.tablePropertiesByPropName.set(prop, dproperty);
      const prefix = this.prefix;
      const prefprop = `${prefix}-${prop}`;
      // Chaque propriété doit avoir son conteneur de nom '<propName>-container'
      const container = this.obj.querySelector(`#${prefprop}-container`);
      if (container) {
        const label = ((container as HTMLElement).querySelector('label') as HTMLElement);
        let shortcut: string;
        if (dproperty.no_shortcut) {
          shortcut = '';
        } else {
          shortcut = '<shortcut>' + lettres.pop() + '</shortcut> ';
        }
        label.innerHTML = shortcut + label.innerHTML;
        Object.assign(dproperty, { container: container });
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

        /**
         * S'il faut observer le champ (si par exemple onChange est défini), alors
         * l'observer
         */
        if ( dproperty.onChange ) {
          propField.addEventListener('change', dproperty.onChange);
        }

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