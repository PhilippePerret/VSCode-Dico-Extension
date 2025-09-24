import { RpcChannel } from '../../bothside/RpcChannel';
import { AnyItemType, DBExempleType, ExempleType  } from '../../bothside/types';
import { StringNormalizer } from '../../bothside/StringUtils';
import { ClientItem } from '../ClientItem';
import { createRpcClient } from '../RpcClient';
import { AccessTable } from '../services/AccessTable';
import { PanelClient } from '../PanelClient';
import { ExempleForm } from './ExempleForm';
import { ComplexRpc } from '../services/ComplexRpc';


export class Exemple extends ClientItem<ExempleType> {
  readonly type = 'exemple';
  static readonly minName = 'exemple';
  static readonly klass = Exemple;
  static currentItem: Exemple;
  
  // Constructor and data access
  // Mais bon… on s'en sert le moins possible
  constructor(public data: ExempleType) {
    super(data);
  }
  
  // Getters pour accès direct aux propriétés courantes
  get oeuvre_id(): string { return this.data.dbData.oeuvre_id; }
  get indice(): number { return this.data.dbData.indice; }
  get entry_id(): string { return this.data.dbData.entry_id; }
  get content(): string { return this.data.dbData.content; }
  get notes(): string | undefined { return this.data.dbData.notes; }

  static setAccessTableWithItems(items: ExempleType[]) {
    this._accessTable = new AccessTable<ExempleType>(this.panel, items);
  }
  public static _accessTable: AccessTable<ExempleType>;
  
  static doExemplesExist(exemples: string[][]): {known: string[], unknown: string[]} {
    const resultat: {known: string[], unknown: string[]} = {known: [], unknown: []};
    exemples.forEach(paire => {
      const [oeuvreId, exIndice] = paire;
      const paireStr = paire.join(':');
      if ( this.exempleExists(oeuvreId, Number(exIndice))) {
        resultat.known.push(paireStr);
      } else {
        resultat.unknown.push(paireStr);
      }
    });
    return resultat;
  }
  static exempleExists(oeuvreId: string, exIndice: number) {
    return !!this.accessTable.exists(`${oeuvreId}-${exIndice}`);
  }
  
  /**
   * Méthode pour enregistrer l'item dans la table
   * 
   * 
   */
  public static saveItem(item: DBExempleType, compRpcId: string) {
    RpcEx.notify('save-item', {CRId: compRpcId, item: item});
  }

  /**
   * Fonction qui retourne un indice libre pour un nouvel exemple.
   * 
   * (note : cet indice est attribué à la fin de l'édition, au moment 
   * de la validation de l'exemple).
   * 
   * @param oeuvreId Identifiant de l'oeuvre
   * @returns L'indice pour le nouvel exemple.
   */
  static getNextIndiceForOeuvre(oeuvreId: string): number {
    let indice = 0;
    this.accessTable.each((item: ExempleType) => {
      if (item.dbData.oeuvre_id === oeuvreId) {
        if ( indice < item.dbData.indice) { indice = Number(item.dbData.indice);}
      }
    });
    return indice + 1;
  }
  
  public static autoCompleteBaliseTerm(triggre: string, ev: Event){
    return this.panel.flash('Auto complétion seulement pour panneau des entrées.', 'notice');
  }

}


interface OTitre {
  id: string;
  obj: HTMLDivElement;        // l'objet complet du titre
  display: 'block' | 'none';  // pour savoir s'il est affiché ou non
  titre: string;              // le titre affiché
}


/**
 * 
 * 
 * ============== PANNEAU EXEMPLES =================
 * 
 * 
 * 
 */


class ExemplePanelClass extends PanelClient<ExempleType> {
  public get accessTable(){ return Exemple.accessTable ; }

  modeFiltre = 'by-title';
  BlockTitres: Map<string, OTitre> = new Map();

  initialize(){
    // On montre le menu qui permet de choisir le mode de filtrage de
    // la liste.
    (document.querySelector('#search-by-div') as HTMLDivElement)
      .classList.remove('hidden');
  }

  // Certaines propriétés reçoivent un traitement particulier :
  // - l'entrée reçoit un lien pour rejoindre la définition dans le panneau des définitions
  formateProp(ex: ExempleType, prop: string, value: string | number): string {

    switch(prop) {
      case 'entree_formated':
        return `<a data-type="entry" data-id="${ex.dbData.entry_id}">${value}</a>`;
      default: return String(value);
    }
  }
  
  /**
   * Fonction faite pour montrer un exemple
   * 
   * @param exId Identifiant de l'exemple (OeuvreId:Indice) ou seulement l'identifiant de l'œuvre si indice est fourni
   * @param indice Indice de l'exemple pour l'Œuvre
   */
  public showExemple(oeuvreId: string, indice: string | undefined = undefined){
    if (indice === undefined) { [oeuvreId, indice] = oeuvreId.split(':'); }
    const selector = `main#items div.exemple[data-id="${oeuvreId}-${indice}"]`;
    this.scrollTo(this.container.querySelector(selector) as HTMLElement);
    this.accessTable.selectionManager.selectItem(`${oeuvreId}-${indice}`);
  }


  observePanel(): void {
    super.observePanel();
    this.menuModeFiltre.addEventListener('change', this.onChangeModeFiltre.bind(this));
    // On place un observateur sur les <a data-type data-id> pour qu'ils appellent
    // les messages voulus
    // data-type="entry" pour rejoindre les définitions (afficher la définition voulue)
    // data-type="oeuvre" pour rejoindre l'œuvre voulue (l'afficher)
    this.container.querySelectorAll('a[data-type][data-id]').forEach(link => {
      link.addEventListener('click', this.onClickLinkToEntry.bind(this, link));
    });
  }
  onClickLinkToEntry(link: Element, _ev: any){
    const entryId = (link as HTMLElement).dataset.id;
    console.log("[CLIENT] Demande d'affichage de l'entrée '%s'", entryId);
    RpcEx.notify('display-entry', {entry_id: entryId});
  }
  onClickLinkToOeuvre(obj: HTMLElement, _ev: MouseEvent) {
    const oeuvreId = obj.dataset.id ;
    console.log("[CLIENT Exemple] Demande d'affichage de l'œuvre %s", oeuvreId);
    RpcEx.notify('display-oeuvre', { oeuvreId });
  }


  onChangeModeFiltre(_ev: any){
    this.modeFiltre = this.menuModeFiltre.value;
    console.info("Le mode de filtrage a été mis à '%s'", this.modeFiltre);
  }
  get menuModeFiltre(){return (document.querySelector('#search-by') as HTMLSelectElement);}
  
  /**
   * Appelée après l'affichage des exemples, principalement pour
   * afficher les titres des oeuvres dans le DOM.
   */
  protected afterDisplayItems(accessTable: AccessTable<ExempleType>){
    // Principe : on boucle sur tous les éléments (qui sont forcément 
    // classés par oeuvre) et dès qu'on passe à une autre oeuvre on
    // crée un nouveau titre.
    let currentOeuvreId: string = ''; // le titre couramment affiché
    accessTable.each((item: ExempleType): undefined => {
      const ditem = item;
      // console.log("dbData.oeuvre_id = '%s' / currentOeuvreId = '%s'", ditem.dbData.oeuvre_id, currentOeuvreId);
      if ( ditem.dbData.oeuvre_id === currentOeuvreId ) { return ; }
      // console.log("Nouveau titre pour %s ", ditem.cachedData.oeuvre_titre);
      // --- NOUVEAU TITRE ---
      this.insertTitleInDom(ditem);
      currentOeuvreId = String(ditem.dbData.oeuvre_id);
   });
  }

  public insertInDom(item: ExempleType, before: ExempleType | undefined) {
    super.insertInDom(item, before);
    if (before && item.dbData.indice === 1) {
      this.insertTitleInDom(item);
    }
  }

  /**
   * Fonction pour insérer un titre d'œuvre dans le DOM et dans la
   * donnée des titres this.BlockTitres.
   * 
   * @param item Le premier exemple de l'oeuvre
   */
  private insertTitleInDom(item: ExempleType) {
    const oeuvreId:string = item.dbData.oeuvre_id;
    const obj = document.createElement('h2');
    obj.dataset.id = oeuvreId;
    obj.addEventListener('click', this.onClickLinkToOeuvre.bind(this, obj));
    obj.className = 'titre-oeuvre';
    const spanTit = document.createElement('span');
    spanTit.className = 'titre';
    spanTit.innerHTML = item.cachedData.oeuvre_titre;
    obj.appendChild(spanTit);
    const titre = {
      id: oeuvreId,
      obj: obj,
      titre: item.cachedData.oeuvre_titre,
      display: 'block'
    } as OTitre;
    // On consigne ce titre pour pouvoir le manipuler facilement
    this.BlockTitres.set(titre.id, titre);
    const firstEx = document.querySelector(`main#items > div[data-id="${item.id}"]`);
    this.container.insertBefore(obj, firstEx);
  }
  /**
   * Filtrage des exemples 
   * Méthode spécifique Exemple
   * 
   * En mode "normal"
   * Le filtrage, sauf indication contraire, se fait par rapport aux
   * titres de film. Le mécanisme est le suivant : l'user tape un
   * début de titres de film. On en déduit les titres grâce à la
   * méthode de la classe Oeuvre. On prend l'identifiant et on 
   * affiche tous les exemples du film voulu.
   * 
   * En mode "Entrée", l'utilisateur tape une entrée du dictionnaire
   * et la méthode renvoie tous les exemples concernant cette entrée.
   * 
   * En mode "Contenu", la recherche se fait sur le contenu, partout
   * et sur toutes les entrées.
   * 
   */
  searchMatchingItems(searched: string): ExempleType[] {
    const searchLow = StringNormalizer.toLower(searched);
    const searchRa = StringNormalizer.rationalize(searched); 
    let exemplesFound: ExempleType[];

    switch (this.modeFiltre) {

      case 'by-title':
        // Filtrage par titre d'œuvre (défaut)
        exemplesFound = this.filter(Exemple.accessTable, (ex: AnyItemType) => {
          return (ex as ExempleType).cachedData.titresLookUp.some((titre: string) => {
            return titre.substring(0, searchLow.length) === searchLow;
          });
        }) as ExempleType[];
        break;
      case 'by-entry':
        // Filtrage pour entrée
        exemplesFound = this.filter(Exemple.accessTable, (ex: AnyItemType) => {
          const seg = (ex as ExempleType).cachedData.entry4filter.substring(0, searchLow.length);
          return seg === searchLow || seg === searchRa;
        }) as ExempleType[];
        break;
      case 'by-content':
         exemplesFound = this.filter(Exemple.accessTable, (ex: AnyItemType) => {
          console.log("ex", ex);
          ex = ex as ExempleType;
          return ex.cachedData.content_min.includes(searchLow) ||
            ex.cachedData.content_min_ra.includes(searchRa);
        }) as ExempleType[];
        break;
      default:
        return [] ; // ne doit jamais être atteint, juste pour lint
    }
    // Traitement des titres
    // On par du principe que les titres des exemples choisis doivent
    // être affichés (note : je pense que ça peut être une méthode
    // communes à tous les filtrages)
    
    // Pour consigner les titres modifiés
    const titres2aff: Map<string, boolean> = new Map();

    exemplesFound.forEach((ex: ExempleType) => {
      // Si le titre a déjà été traité, on passe au suivant
      if ( titres2aff.has(ex.dbData.oeuvre_id)) { return ; }
      titres2aff.set(ex.dbData.oeuvre_id, true);
    });
    // Ici, on a dans titres2aff les titres à afficher
    this.BlockTitres.forEach((btitre:OTitre) => {
      const dispWanted = titres2aff.has(btitre.id) ? 'block' : 'none';
      if ( btitre.display === dispWanted) { return ; }
      btitre.display = dispWanted ;
      btitre.obj.style.display = dispWanted;
    });

    return exemplesFound;
 }

} // class ExemplePanelClass


// Instancier le panneau
const ExemplePanel = new ExemplePanelClass({
  minName: 'exemple',
  titName: 'Exemples',
  klass: Exemple,
  form: new ExempleForm() as ExempleForm,
});
ExemplePanel.form = new ExempleForm() as ExempleForm;
ExemplePanel.form.setPanel(ExemplePanel);
Exemple.panel = ExemplePanel;


/**
 * 
 * 
 * ============== RPC EXEMPLES ================
 * 
 * 
 * 
 */

export const RpcEx: RpcChannel = createRpcClient();

RpcEx.on('activate', () => {
  if ( ExemplePanel.isActif ) { return ; }
  // console.log("[CLIENT EXEMPLES] Je dois marquer le panneau Ex actif");
  ExemplePanel.activate();
});
RpcEx.on('desactivate', () => {
  if ( ExemplePanel.isInactif ) { return ; }
  // console.log("[CLIENT EXEMPLES] Je dois marquer le panneau Ex comme inactif.");
  ExemplePanel.desactivate();
});

RpcEx.on('populate', (params) => {
  // console.log("[CLIENT-EXemples] Items remontés :", params.data);
  Exemple.deserializeItems(params.data);
  ExemplePanel.populate(Exemple.accessTable);
  ExemplePanel.initialize();
  ExemplePanel.initKeyManager();
});

RpcEx.on('show-exemple', (params: {exId: string}) => {
  console.log("[PANNEAU EXEMPLE] Montrer l'exemple d'identifiant : ", params.exId);
  ExemplePanel.showExemple(params.exId);
});


RpcEx.on('check-exemples', (params) => {
  // console.log("[PANNEAU EXEMPLE] Demande de vérification des exemples :", params.exemples);
  const resultat = Exemple.doExemplesExist(params.exemples);
  RpcEx.notify('check-exemples-resultat', {CRId: params.CRId, resultat: resultat});
});

RpcEx.on('entry-for-exemple', (params: {entryId: string, entryEntree: string}) => {
  // console.log("Je reçois dans le panneau exemple l'entrée '%s'", params.entryId);
  if ( ExemplePanel.form.isActive() ) {
    (ExemplePanel.form as ExempleForm).setEntry(params.entryId, params.entryEntree);
  } else {
    ExemplePanel.flash('Aucun exemple n’est en édition…', 'error');
  }
});

RpcEx.on('oeuvre-for-exemple', (params: {oeuvreId: string, oeuvreTitre: string}) => {
  // console.log("Je reçois dans le panneau exemple l'oeuvre '%s'", params.oeuvreId);
  if ( ExemplePanel.form.isActive() ) {
    (ExemplePanel.form as ExempleForm).setOeuvre(params.oeuvreId, params.oeuvreTitre);
  } else {
    ExemplePanel.flash('Aucun exemple n’est en édition…', 'error');
  }
});

RpcEx.on('after-saved-item', (params) => {
  // console.log("[CLIENT Exemple] Réception du after-saved-item", params);
  ComplexRpc.resolveRequest(params.CRId, params);
});


(window as any).Exemple = Exemple;