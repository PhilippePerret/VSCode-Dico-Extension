import { AnyItemType, DBExempleType, ExempleType } from "../../bothside/types";
import { ComplexRpc } from "../services/ComplexRpc";
import { FormManager, FormProperty } from "../services/FormManager";
import { Exemple } from "./Exemple";


export class ExempleForm extends FormManager<ExempleType, DBExempleType> {
  formId = 'exemple-form';
  prefix = 'exemple';
  properties: FormProperty[] = [
    {propName: 'id', type: String, required: true, fieldType: 'text', locked: true, no_shortcut: true},
    {propName: 'entry_id', type: String, required: true, fieldType: 'text', no_shortcut: true},
    {propName: 'oeuvre_id', type: String, required: true, fieldType: 'text', no_shortcut: true},
    {propName: 'content', type: String, required: true, fieldType: 'textarea'},
    {propName: 'notes', type: String, required: true, fieldType: 'textarea'},
  ];
  // Table des raccourcis 'one key' propre au formulaire
  tableKeys = {
    // <touche>: {lab: 'label pour info', fn: <fonction bindée>}, par exemple
    // 'i': {lab: 'obtenir des infos', fn: this.showInfo.bind(this)}
  };

  public propsToRemove(): string[] {
    return ['id'];
  }

  /**
   * Grand méthode de check de l'item.
   * 
   * Pour un exemple, il suffit de vérifier que le contenu contienne
   * ce qu'il faut. Car les autres valeurs sont des identifiants qui
   * n'ont pas pu être forcés.
   * 
   * @returns undefined si la donnée est valide ou le string du message d'erreur dans le cas contraire.
   */
  async checkEditedItem(): Promise<string | undefined> {
    const item = this.editedItem;
    const changeset = item.changeset;
    const isNew = item.changeset.isNew;
    const errors: string[] = [];

    // L'identifiant de l'œuvre doit être défini
    if ( changeset.oeuvre_id !== undefined ) {
      if (changeset.oeuvre_id === '') {errors.push("L’œuvre de l’exemple doit être définie. (⇧?)");} 
    }

    // L'identifiant de l'entrée doit être défini
    if ( changeset.entry_id !== undefined) {
      if (changeset.entry_id === '') {errors.push("L’entrée de l’exemple doit être définie. (⇧?)");}
    }

    // Le contenu doit avoir été défini
    if (changeset.content !== undefined) {
      if (changeset.content === '') {errors.push("Il faut impérativement décrire l'exemple");}
      else if (changeset.content.length < 30) {
        errors.push("Cet description d’exemple me parait trop courte… (ajouter &lt;!-- force content --&gt; pour forcer)");
      }
    }

    // L'exemple doit avoir un indice
    if ( undefined === (item.original as DBExempleType).indice) {
      if (isNew) {
        // C'est normal, on doit définir l'indice en fonction des exemples que contient déjà l'oeuvre
        const indice: number = Exemple.getNextIndiceForOeuvre(changeset.oeuvre_id);
        Object.assign(changeset, {indice: indice});
      } else {
        this.panel.flash("GRAVE PROBLÈME : L'indice devrait être déjà défini, pour un exemple déjà sauvegardé…", 'error');
      }
    }

    // résultat final retourné
    if (errors.length) {
      console.error("Données invalides", errors);
      return errors.join(', ').toLowerCase();
    }
  }

  /**
   * Méthode pour enregistrer les données si elles ont été modifiées.
   * 
   * @param data2save Les données à sauvegarder
   * @returns True si tout s'est bien passé
   */
  async onSaveEditedItem(data2save: DBExempleType): Promise<boolean> {
    // console.log("Exemple à sauvegarder (item complet)", this.editedItem);
    // console.log("Données à sauvegarder", data2save);
    const itemSaver = new ComplexRpc({
      call: Exemple.saveItem.bind(Exemple, data2save)
    });
    const res = await itemSaver.run() as {ok: boolean, errors: any, item: DBExempleType, itemPrepared: ExempleType};
    // console.log("res dans onSave de l'exemple", res);
    if (res.ok) {
      this.panel.flash('Exemple enregistré avec succès en Db.', 'notice');
      let item: AnyItemType, nextItem: AnyItemType | undefined;
      [item, nextItem] = Exemple.accessTable.upsert(res.itemPrepared);
      if (nextItem /* Quand création d'un nouvel exemple */) {
        this.panel.insertInDom(item, nextItem);
        // Note : La méthode ajoutera aussi le titre si c'est le premier
        // exemple
      } else {
        this.panel.updateInDom(item);
      }
    } else {
      console.error("ERREURS À L'ENREGISTREMENT DE L'EXEMPLE", res.errors);
      this.panel.flash('Erreur (à l’enregistre de l’exemple — voir la console)', 'error');
      return false;
    }
    return true;
  }

  // Pour observer le formulaire
  observeForm(): void {
    // TODO
  }

  // Ce qu'il faut faire juste après l'édition de l'exemple
  afterEdit(): void {
    // TODO
  }

  setEntry(entryId: string, entryEntree: string){
    this.setValueOf('entry_id', entryId);
    (this.obj.querySelector('span#exemple-entry-explicit') as HTMLElement).innerText = entryEntree;
  }
  setOeuvre(oeuvreId: string, oeuvreTitre: string){
    this.setValueOf('oeuvre_id', oeuvreId);
    (this.obj.querySelector('span#exemple-oeuvre-explicit') as HTMLElement).innerText = oeuvreTitre;
  }
}