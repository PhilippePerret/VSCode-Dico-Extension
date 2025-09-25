import { AnyItemType } from "../../bothside/types";
import { PanelClient } from "../PanelClient";
import { AccessTable } from "./AccessTable";

const DEBUGIT = false;
/**
 * Class principal de la gestion des sélections dans les panneaux.
 * Chaque panneau possède son propre manager de sélection puisque les
 * panneaux sont totalement indépendants.
 * 
 * ATTENTION : Ce n'est pas cette classe qui gère l'aspect des
 * éléments sélectionnés, c'est l'accessTable (jusqu'à nouvel ordre
 * en tout cas...)
 * 
 * C'est l'AccessTable de chaque panneau qui possède une instance de cette
 * classe appelé selectionManager. Donc <panel>.accessTable.selectionManager.
 * 
 * Pour le moment, on part du principe qu'il y a une seule sélection à la fois et
 * qu'il y a toujours une sélection (la précédente ou la première).
 * 
 * On mémorise l'historique des sélections afin de pouvoir y revenir.
 * 
 * On ne manipule ici que des identifiants d'item, donc des strings courts.
 */

export class SelectionManager {
  // La panneau associé au manager de sélection
  private panel: PanelClient<AnyItemType>;

  private current: string | undefined = undefined;
  public getCurrent(): string | undefined { return this.current; }
  private icursor: number = 0;
  private historique: string[] = [];
 
  constructor(
    private accessTable: AccessTable<AnyItemType>,
  ) {
    this.panel = accessTable.panel;
  }

  /**
   * @api
   * 
   * Sélection du prochain item (ou le premier)
   * 
   */
  public selectNextVisibleItem(){
    let nextId: string | undefined = undefined;
    if (this.current) {
      nextId = (this.accessTable.getNextVisible(this.current) as AnyItemType)?.id;
    }
    nextId = nextId || (this.accessTable.getFirstVisible() as AnyItemType).id;
    
    this.debugit('Affectation de l’item', nextId);

    // On sélectionne l'item suivant (ou le premier)
    this.setAsCurrentSelected(nextId);

    // On l'ajoute à l'historique
    this.add(nextId);
  }

  /**
   * @papi
   * 
   * Sélection de l'item visible précédent.
   * 
   */
  public selectPreviousVisibleItem(){
    let prevId: string | undefined = undefined;
    if (this.current){
      prevId = (this.accessTable.getPrevVisible(this.current) as AnyItemType)?.id;
    }
    prevId = prevId || (this.accessTable.getLastVisible() as AnyItemType).id;
    // Et on sélectionne l'item précédent (ou le premier)
    this.setAsCurrentSelected(prevId);
    
    // On l'ajoute à l'historique
    this.add(prevId);

  }
  /**
   * @api
   * 
   * Méthode pour déselectionner la sélection courante.
   * 
   * Elle doit être publique car elle sert par exemple en cas de
   * filtrage de la liste.
   * 
   */
  public deselectCurrent(){
    this.current && this.accessTable.setSelectState(this.current, false);
    this.current = undefined; 
  }
 
  /**
   * @api
   * 
   * (Re)sélectionne l'item précédent.
   * 
   * Le "re" de "reselectionne" n'est là que pour indiquer qu'on fait
   * cette opération est par une sélection "classique". Elle est
   * utilisée en cas de filtrage de liste, quand l'itemp qui été sé-
   * lectionné et encore visible. Mais this.current a été mis à rien
   * au début du filtrage.
   * 
   * Note : on ne l'ajoute pas à l'historique puisqu'il s'y trouve 
   * déjà.
   */
  reselectItem(itemId: string){
    this.setAsCurrentSelected(itemId);
  }

  /**
   * @api Par exemple sélection demandée depuis un autre panneau
   * 
   * @param itemId Identifiant de l'item à sélectionner
   */
  selectItem(itemId: string){
    this.setAsCurrentSelected(itemId);
    this.add(itemId);
  }

  /**
    * Pour revenir à l'item précédent
    */
  public historyBack() {
    this.debugit('back');
    this.ensurePrevCursor();
    this.setAsCurrentSelected(this.historique[this.icursor]);
  }
  /**
   * Pour passer à l'élément suivant
   */
  public historyNext() {
    this.debugit('next');
    this.ensureNextCursor();
    this.setAsCurrentSelected(this.historique[this.icursor]);
  }

  /**
   * Pour retirer l'item courant de l'historique des sélections
   */
  public removeCurrentFromHistory() {
    if (this.size === 1) {
      this.panel.flash("On ne peut pas retirer le dernier item d’historique sélectionné.", 'warn');
    } else {
      this.historique.splice(this.icursor);
      this.historyBack();
    }
  }



  /**
   * Méthode qui s'occupe de mettre l'élément +itemId+ en item 
   * courant en s'assurant de sélectionner l'item qui serait
   * actuellement sélectionné.
   * 
   * @param itemId Identifiant de l'élément à mettre en courant
   */
  private setAsCurrentSelected(itemId: string){
     // S'il y avait un sélectionné, on le déselectionne
    this.current && this.deselectCurrent();
    // On met le nouveau courant
    this.current = String(itemId);
    // On sélectionne l'item
    this.select();
    // Et on scrolle jusqu'à lui
    this.panel.scrollTo(this.current);
  }
  

  private select() {
    this.current && this.accessTable.setSelectState(this.current, true);
  }

  private add(itemId: string) {
    this.debugit('add');
    this.historique.push(itemId);
    this.icursor = this.lastIndex;
  }
  private ensurePrevCursor() {
    this.icursor--;
    if (this.icursor < 0) { this.icursor = this.lastIndex; }
  }
  private ensureNextCursor() {
    this.icursor++;
    if (this.icursor > this.lastIndex) { this.icursor = 0; }
  }

  private get lastIndex() { return this.size - 1; }
  private get size() { return this.historique.length; }

  // Pour débugger la classe
  private debugit(where: string, id: string | undefined = undefined) {
    if (!DEBUGIT) { return; }
    console.log(`
      [${where}]
      icursor = %i
      current = '%s'
      id fourni = '%s'
      `, this.icursor, (this.current ? `'${this.current}'` : 'undefined'), id, this.historique);
  }


}
