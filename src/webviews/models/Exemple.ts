import { RpcChannel } from '../../bothside/RpcChannel';
import { UExemple } from '../../bothside/UExemple';
import { FullExemple } from '../../extension/models/Exemple';
import { StringNormalizer } from '../../bothside/StringUtils';
import { ClientItem } from '../ClientItem';
import { createRpcClient } from '../RpcClient';
import { VimLikeManager } from '../services/VimLikeManager';
import { AccessTable } from '../services/AccessTable';
import { PanelClient } from '../PanelClient';
import { AnyElementType } from './AnyClientElement';
import { ExempleForm } from './ExempleForm';


export class Exemple extends ClientItem<UExemple, FullExemple> {
  declare public data: FullExemple;
  readonly type = 'exemple';
  static readonly minName = 'exemple';
  static readonly klass = Exemple;
  static currentItem: Exemple;
  static setAccessTable(items: Exemple[]) {
    this._accessTable = new AccessTable<Exemple>(Exemple, items);
  }

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
    return !!this.accessTable.existsById(`${oeuvreId}-${exIndice}`);
  }



}


interface OTitre {
  id: string;
  obj: HTMLDivElement;        // l'objet complet du titre
  display: 'block' | 'none';  // pour savoir s'il est affiché ou non
  titre: string;              // le titre affiché
}

class ExemplePanelClass extends PanelClient<Exemple, typeof Exemple> {
  protected get accessTable(){ return Exemple.accessTable ; }
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
  formateProp(ex: Exemple, prop: string, value: string | number): string {

    switch(prop) {
      case 'entree_formated':
        return `<a data-type="entry" data-id="${ex.data.entry_id}">${value}</a>`;
      default: return String(value);
    }
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
  protected afterDisplayItems(accessTable: AccessTable<Exemple>){
    // Principe : on boucle sur tous les éléments (qui sont forcément 
    // classés par oeuvre) et dès qu'on passe à une autre oeuvre on
    // crée un nouveau titre.
    let currentOeuvreId: string = ''; // le titre couramment affiché
    accessTable.each((item: Exemple): undefined => {
      const ditem = item.data;
      if ( ditem.oeuvre_id === currentOeuvreId ) { return ; }
      // --- NOUVEAU TITRE ---
      currentOeuvreId = ditem.oeuvre_id;
      const obj = document.createElement('h2');
      obj.dataset.id = currentOeuvreId;
      obj.addEventListener('click', this.onClickLinkToOeuvre.bind(this, obj));
      obj.className = 'titre-oeuvre';
      const spanTit = document.createElement('span');
      spanTit.className = 'titre';
      spanTit.innerHTML = ditem.oeuvre_titre;
      obj.appendChild(spanTit);
      const titre = {
        id: ditem.oeuvre_id,
        obj: obj,
        titre: ditem.oeuvre_titre,
        display: 'block'
      } as OTitre;
      // On consigne ce titre pour pouvoir le manipuler facilement
      this.BlockTitres.set(titre.id, titre);

      const firstEx = document.querySelector(`main#items > div[data-id="${ditem.id}"]`);
      this.container.insertBefore(obj, firstEx);
    });
  }

  initKeyManager() {
    this._keyManager = new VimLikeManager(document.body as HTMLBodyElement, this, Exemple);
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
  searchMatchingItems(searched: string): Exemple[] {
    const searchLow = StringNormalizer.toLower(searched);
    const searchRa = StringNormalizer.rationalize(searched); 
    let exemplesFound: Exemple[];

    switch (this.modeFiltre) {

      case 'by-title':
        // Filtrage par titre d'œuvre (défaut)
        exemplesFound = this.filter(Exemple.accessTable, (ex: AnyElementType) => {
          ex = ex as Exemple;
          return ex.data.titresLookUp.some((titre: string) => {
            return titre.substring(0, searchLow.length) === searchLow;
          });
        }) as Exemple[];
        break;
      case 'by-entry':
        // Filtrage pour entrée
        exemplesFound = this.filter(Exemple.accessTable, (ex: AnyElementType) => {
          const seg = (ex as Exemple).data.entry4filter.substring(0, searchLow.length);
          return seg === searchLow || seg === searchRa;
        }) as Exemple[];
        break;
      case 'by-content':
         exemplesFound = this.filter(Exemple.accessTable, (ex: AnyElementType) => {
          ex = ex as Exemple;
          console.log("ex", ex.data);
          return ex.data.content_min.includes(searchLow) ||
            ex.data.content_min_ra.includes(searchRa);
        }) as Exemple[];
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

    exemplesFound.forEach((ex: Exemple) => {
      // Si le titre a déjà été traité, on passe au suivant
      if ( titres2aff.has(ex.data.oeuvre_id)) { return ; }
      titres2aff.set(ex.data.oeuvre_id, true);
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
}

// Instancier le panneau
const ExemplePanel = new ExemplePanelClass({
  minName: 'exemple',
  titName: 'Exemples',
  klass: Exemple,
  form: new ExempleForm()
});
Exemple.panel = ExemplePanel;

export const RpcEx: RpcChannel = createRpcClient();

RpcEx.on('activate', () => {
  if ( ExemplePanel.isActif ) { return ; }
  console.log("[CLIENT EXEMPLES] Je dois marquer le panneau Ex actif");
  ExemplePanel.activate();
});
RpcEx.on('desactivate', () => {
  if ( ExemplePanel.isInactif ) { return ; }
  console.log("[CLIENT EXEMPLES] Je dois marquer le panneau Ex comme inactif.");
  ExemplePanel.desactivate();
});

RpcEx.on('populate', (params) => {
  // console.log("[CLIENT-EXemples] Items remontés :", params.data);
  const items = Exemple.deserializeItems(params.data, Exemple);
  // console.log("[CLIENT-Exemple Items désérialisés", items);
  // console.log("[EXEMPLES] Table d'acces", Exemple.accessTable);
  ExemplePanel.populate(Exemple.accessTable);
  ExemplePanel.initialize();
  ExemplePanel.initKeyManager();
});

RpcEx.on('check-exemples', (params) => {
  console.log("[PANNEAU EXEMPLE] Demande de vérification des exemples :", params.exemples);
  const resultat = Exemple.doExemplesExist(params.exemples);
  console.log("Résultat du check", resultat);
});

(window as any).Exemple = Exemple;