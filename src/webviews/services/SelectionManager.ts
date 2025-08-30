import { AnyElementClass, AnyElementType } from "../models/AnyClientElement";

/**
 * Class principal de la gestion des sélections dans les panneaux.
 * Chaque panneau possède son propre manager de sélection puisque les
 * panneaux sont totalement indépendants.
 * 
 * Pour le moment, on part du principe qu'il y a une seule sélection à la fois et
 * qu'il y a toujours une sélection (la précédente ou la première).
 */
interface SelectionConfig<T> {
  currentSelection: T;
}
interface Selectable {
  obj: HTMLElement;
  data: {selected: boolean};
}

export class SelectionManager {

  private _currentSelection!: AnyElementType | undefined ;

  constructor(private klass: AnyElementType) {
  }
  
  select(item: AnyElementType) {
    this._currentSelection && this.deselect(this._currentSelection);
    item.obj.classList.add('selected');
    this._currentSelection = item;
    // TODO Apprendre à les enregistrer dans accessTable.
  }
  deselect(item: AnyElementType) {
    item.obj.classList.remove('selected');
  // TODO Apprendre à les enregistrer dans accessTable
  }
}
