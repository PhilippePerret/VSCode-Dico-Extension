import { StringNormalizer } from "../../bothside/StringUtils";
import { IOeuvre } from "../../extension/models/Oeuvre";
import { ComplexRpc } from "../services/ComplexRpc";
import { stopEvent } from "../services/DomUtils";
import { FormManager, FormProperty } from "../services/FormManager";
import { OeuvrePicker, OptionsOeuvre, TMDB } from "../services/OeuvreFinder";
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
    {propName: 'auteurs', type: String, required: true, fieldType: 'text', onChange: this.onChangeAuteurs.bind(this)},
    {propName: 'type', type: String, required: true, fieldType: 'select', values: [['film', 'Film'], ['roman', 'Roman'], ['pièce', 'Pièce'], ['livre', 'Livre'], ['bd', 'BD']]},
    {propName: 'annee', type: String, required: true, fieldType: 'text'},
    {propName: 'resume', type: String, required: false, fieldType: 'textarea'},
    {propName: 'notes', type: String, required: false, fieldType: 'textarea'}
  ];
  // Table des raccourcis 'one key' propre au formulaire 
  tableKeys = {
    i: this.getOeuvreExternInfo.bind(this)
  };

  static readonly REG_AUTEUR = /([^ ]+) ([^\[])\[(H|F)\]/;

  afterEdit(): void {
    const id = this.getValueOf('id');
    const isNew = id === '';
    this.setIdLock(!isNew);
    this.panel.context = isNew ? 'create-oeuvre' : 'edit-oeuvre';
  }

  async checkItem(item: FOeuvre): Promise<string | undefined> {
    const errors: string[] = [];
    let errs:string | undefined; // Pour mettre les erreurs provisoires

    // En cas de nouvelle œuvre
    if (this.isNewItem) {
      // Pas mal de choses ont déjà été vérifiées, et notamment le 
      // fait que les titres n'existent pas.
      
    }

    if (item.id === '' || !item.id){
      errors.push('Il faut absolument que cet item ait un identifiant.');
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

    const errs: string[] = [];
    const genderErrs = this.checkAuteursHaveGender(auts);
    genderErrs && errs.push(genderErrs);
   
    if ( errs.length ) { return errs.join(', ');}
  }
  
  /**
   * Vérifie si les auteurs sont bien formatés (sexe au bout)
   * 
   * @param auteurs Liste des auteurs de l'œuvre
   * @returns Liste des erreurs trouvées (liste vide si aucune)
   */
  checkAuteursHaveGender(auteurs: string[]): string | undefined {
    const errs = auteurs.map((aut: string) => {
      if ( null === aut.match(/\[(H|F)\]$/) ){
        return aut;
      } else {
        return null;
      }
    })
    .filter((e: string | null) => e !== null);

    if (errs.length) {
      return `Il faut préciser le sexe de ${errs.join(', ')} (en mettant "[H]" ou "[F]" à la fin)`;
    }
  }

  observeForm(): void {
    const btnTMDB = this.obj.querySelector('.btn-get-infos');
    btnTMDB?.addEventListener('click', this.getOeuvreExternInfo.bind(this));
  }

  async getOeuvreExternInfo(ev: Event){
    const titre = ((this.getValueOf('titre_original') || this.getValueOf('titre_affiche')) as string).trim();
    if (titre === '') {
      this.flash('Il faut indiquer le titre de l’œuvre !', 'error');
    } else {
      this.flash('Je récupère les informations du film ' + titre + '…');
      const options = {
        langue: undefined, 
        annee: this.getValueOf('annee'),
        type: this.getValueOf('type'),
      } as OptionsOeuvre;
      if ( this.getValueOf('annee') !== '') { Object.assign(options, {annee: Number(this.getValueOf('annee'))});}
      const infos = await OeuvrePicker.findWithTitle(titre, options, this);
    }
    ev && stopEvent(ev);
  }
 
  onChangeAuteurs(ev: Event | undefined = undefined) {
    let auteurs: string | string[] = (this.getValueOf('auteurs') as string).trim();
    if ( auteurs !== '') {
      auteurs = auteurs.split(',').map((au: string) => au.trim());
      const errs = this.checkAuteursHaveGender(auteurs);
      if (errs) { this.flash(errs + '.', 'error'); }
    }

    return ev && stopEvent(ev);
  }

  onChangeTitreAffiched(ev: Event | undefined = undefined){
    const noTitreOriginal = this.getValueOf('titre_original') === '';
    const titaff = this.getValueOf('titre_affiche') as string;
    if ( this.isNewItem) {
     if (Oeuvre.doOeuvresExist([titaff]).known.length) {
        this.flash('Ce titre existe déjà. Si vous voulez vraiment le conserver, ajoutez un indice.', 'error');
        this.setValueOf('titre_affiche', '');
        return ev && stopEvent(ev);
      }
      if (noTitreOriginal) {
        this.setTitreOriginalFromTitreAffiched();
        // On demande à l'utilisateur s'il veut rechercher les infos du 
        // film sur TMDB
        console.log("Il faut que je demande s'il faut rechercher les information du film sur TMDB");
      } else {
        this.flash("Le titre original est défini, je ne le touche pas.");
      }
    }
  }

  private flash(message: string, type: any = 'notice'){
    Oeuvre.panel.flash(message, type);
  }

  private REG_TITRE_AFF = /^(Les|Le|La|Une|Un|The|A) (.+)$/;
  setTitreOriginalFromTitreAffiched() {
    // On construit le titre original en retirant l'éventuel article
    let titreOriginal: any = this.getValueOf('titre_affiche');
    if ( titreOriginal.match(this.REG_TITRE_AFF)) {
      titreOriginal = titreOriginal.replace(this.REG_TITRE_AFF, (tout: string, article: string, reste: string) => {
        return `${reste} (${article})`;
      });
    }
    this.setValueOf('titre_original', titreOriginal);
    this.onChangeTitreOriginal();
  }

  /**
   * Méthode appelée quand on modifie le titre original (normalement,
   * ça n'arrive qu'en cas de nouvelle œuvre).
   * 
   * Noter qu'elle est appelée automatiquement quand le titre
   * original n'était pas défini et qu'on a défini le titre d'affi-
   * chage de l'œuvre.
   * 
   * C'est aussi ici qu'on met un ID automatique s'il n'est pas
   * défini.
   * 
   */
  onChangeTitreOriginal(ev: Event | undefined = undefined){
    const idNotDefined = (this.getValueOf('id') as string).trim() === '';
    const titorig = this.getValueOf('titre_original') as string;
    // Par exemple quand remise à rien pour recalcul de l'id
    if (titorig === '') { return ; }

    if ( this.isNewItem ) {
      // Le titre original ne doit pas exister
      if ( Oeuvre.doOeuvresExist([titorig]).known.length){
        Oeuvre.panel.flash("Ce titre existe déjà. Si c'est vraiment une autre œuvre, ajoutez-lui un indice", 'error');
        this.setValueOf('titre_original', '');
        return;
      }
      if ( idNotDefined) {
        // <= L'identifiant de l'œuvre n'est pas encore définie
        // => On le cherche de façon automatique
        this.setValueOf('id', this.idFromTitre(titorig));
      }
    }
    ev && stopEvent(ev);
  }

  /**
   * Compose un ID unique en fonction du titre original de l'œuvre
   */
  idFromTitre(titre: string): string {
    let proposId: string = "";
    const mots = titre.split(' ').map(m => StringNormalizer.rationalize(m));
    const nbMots = mots.length;
    if ( nbMots >= 3) {
      const nbLettresFin =  nbMots === 3 ? 2 : 1; 
      proposId = mots.map((m: string, i: number) => {
        const isLastMot = i === nbMots - 1;
        const nbLettres = isLastMot ? nbLettresFin : 1;
        return m.substring(0,nbLettres).toUpperCase();
    }).join('');
      proposId = proposId.substring(0, 5); // pas plus de 5 lettres
    } else {
      proposId = titre.substring(0, 5).toUpperCase();
    }
    // Si l'année est définie, on l'ajoute
    let annee;
    if ( annee = this.getValueOf('annee')){
      proposId += String(annee);
    } else {
      this.flash('Quand l’année est précisée, elle est ajoutée à l’ID');
    }
    // Il doit être unique
    var iVar = 1;
    var idTested = String(proposId);
    while(Oeuvre.doIdExist(idTested)) { idTested = `${proposId}{++iVar}`; }
    return proposId;
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