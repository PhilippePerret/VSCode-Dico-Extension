import { IOeuvre } from "../../extension/models/Oeuvre";
import { ComplexRpc } from "../services/ComplexRpc";
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
    {propName: 'id', type: String, required: true, fieldType: 'text'},
    {propName: 'titre_original', type: String, required: true, fieldType: 'text', onChange: this.onChangeTitreOriginal.bind(this)},
    {propName: 'titre_francais', type: String, required: false, fieldType: 'text'},
    {propName: 'auteurs', type: String, required: true, fieldType: 'text'},
    {propName: 'resume', type: String, required: false, fieldType: 'textarea'},
    {propName: 'notes', type: String, required: false, fieldType: 'textarea'}
  ];

  static readonly REG_AUTEUR = /([^ ]+) ([^\[])\[(H|F)\]/;

  afterEdit(): void {
    const id = this.getValueOf('id');
    const isNew = id === '';
    this.setIdLock(!isNew);
  }

  async checkItem(item: FOeuvre): Promise<string | undefined> {
    console.error("Il faut apprendre à checker l'oeuvre");
    const errors: string[] = [];
    let errs:string | undefined; // Pour mettre les erreurs provisoires

    // En cas de nouvelle œuvre
    if ( item.isNew) {
      // Pas mal de choses ont déjà été vérifiées, et notamment le 
      // fait que les titres n'existent pas
    }
    if (item.titre_original.trim().length === 0) {
      errors.push('Il faut fournir le titre de l’œuvre original.');
    }
    
    if ( errs = this.checkAuteurs(item)) {
      errors.push('erreurs trouvés sur les auteurs : ' + errs);
    }

    if (errors.length) {
      console.error("Données invalides", errors);
      return errors.join(', ').toLowerCase();
    }
  }

  checkAuteurs(item: FOeuvre): undefined | string {
    
    let auts = item.auteurs.trim();
    if ( auts.length === 0) {
      return 'Il faut impérativement fournir les autrices et auteurs';
    }
    auts = auts.split(',').map((a: string) => a.trim());

    const errs = auts.map((aut: string) => {
      if ( null === aut.match(/\[(H|F)\]$/) ){
        return `il faut préciser le sexe de ${aut} (H ou F entre crochets)`;
      } else {
        return null;
      }
    })
    .filter((e: string) => e !== null);
    
    if ( errs.length ) { return errs.join(', ');}
  }

  observeForm(): void {
    this.field('titre_original').addEventListener('change', this.onChangeTitreOriginal.bind(this));
  }

  onChangeTitreAffiched(ev: Event | undefined = undefined){
    const noTitreOriginal = this.getValueOf('titre_original') === '';
    if ( this.isNewItem) {
      console.log("Il faut que je demande s'il faut rechercher les information du film sur TMDB");
      if (noTitreOriginal) {
        this.setTitreOriginalFromTitreAffiched();
      }
    }
  }
  private REG_TITRE_AFF = /^(Les|Le|La|Une|Un|The|A) (.+)$/;
  setTitreOriginalFromTitreAffiched() {
    // On construit le titre original en retirant l'éventuel article
    let titreOriginal: any = this.getValueOf('titre_affiche');
    if ( titreOriginal.match(this.REG_TITRE_AFF)) {
      titreOriginal = titreOriginal.replace(this.REG_TITRE_AFF, (tout: string, article: string, reste: string) => {
        return `$2 ($1)`;
      });
    }
    this.setValueOf('titre_original', titreOriginal);
    this.onChangeTitreOriginal();
  }
  onChangeTitreOriginal(ev: Event | undefined = undefined){
    if ( this.isNewItem ) {
      Oeuvre.panel.flash("C'est une nouvelle œuvre", 'notice');
      // Le titre original ne doit pas exister
      const titorig = this.getValueOf('titre_original') as string;
      if ( Oeuvre.doOeuvresExist([titorig]).known.length){
        Oeuvre.panel.flash("Ce titre existe déjà. Si c'est vraiment une autre œuvre, ajoutez-lui un indice", 'error');

      }
    }
    Oeuvre.panel.flash("Vous avez modifié le titre original", 'notice');
    ev && stopEvent(ev);
  }
  /**
   * 
   * @param item L'oeuvre à enregistrer
   * @returns True si l'enregistrement a pu se faire correctement.
   */
  async onSave(item: Oeuvre): Promise<boolean> {
    console.log("Il faut que j'apprendre à sauver : ", item);
    const itemSaver = new ComplexRpc({
      call: Oeuvre.saveItem.bind(Oeuvre, item as unknown as IOeuvre)
    });
    const res = await itemSaver.run() as {ok: boolean, errors: any, item: IOeuvre};
    // console.log("Res après attente de sauvegarde de l'oeuvre", res);
    if (res.ok) {
      console.log("Je dois apprendre à actualiser l'affichage de l'oeuvre ou l'insérer.");
      Oeuvre.panel.flash("Œuvre enregistrée avec succès.", 'notice');
    } else {
      console.error("ERREUR LORS DE L'ENREGISTREMENT DE L'OEUVRE", res.errors);
      Oeuvre.panel.flash('Erreur (enregistrement de l’œuvre (voir la console', 'error');
    }
    return true;
  }


}