import { stopEvent } from "./DomUtils";


export class AutoComplete {
  private static autocomp: AutoComplete | undefined ;

  public static start(params: {
    target: HTMLElement,
    accessTable: any,
    balIn: string, balOut: string
  }){
    this.autocomp = new AutoComplete(params);
    this.autocomp.run();
  }
  public static removeCurrent() {
    this.autocomp = undefined;
  }

  /**
   * 
   * 
   * ================= INSTANCE ===============
   * 
   * 
   * 
   */

  private target: HTMLElement;
  private accessTable: any;
  private balIn: string;
  private balOut: string;
  private finalValue: string = '';
  private obj!: HTMLDivElement; // le widget
  private input!: HTMLInputElement; // le champ pour écrire
  private menu!: HTMLSelectElement; // La liste pour mettre le filtrage
  private candidats: {[x: string]: any}[] = [];
  private candidatsCount: number = 0;

  constructor(
    params: {
      target: HTMLElement,
      accessTable: any,
      balIn: string,
      balOut: string
    }
  ){

    this.target = params.target;
    this.accessTable = params.accessTable;
    this.balIn = params.balIn;
    this.balOut = params.balOut;
  }

  run(){
    // On construit le widget et on l'affiche
    this.build();
    // On met les observateurs d'évènement
    this.observe();
    // Et on affiche le départ
    this.initList();
  }
  
  finish(){
    this.obj.remove();
    const cible = this.target as HTMLTextAreaElement;
    console.log("cible", cible);
    cible.focus();
    cible.setRangeText(
      this.balIn + this.finalValue + this.balOut, 
      cible.selectionStart, 
      cible.selectionEnd, 
      'end'
    );
    AutoComplete.removeCurrent();
  }

  private initList() {
    this.peuple(this.accessTable.filterWithText(''));
  }

  /**
   * Fonction pour choisir finalement l'item
   */
  private select(){
    const indice = Number(this.menu.dataset.indice);
    if (isNaN(indice)) {
      console.warn("Aucun mot n'a été sélectionné.");
      return;
    }
    const item = this.candidats[indice];
    const key: string = item.key ;
    const value: string = item.value.toLowerCase() ; 
    if (key === value) {
      this.finalValue = key;
    } else {
      this.finalValue = `${value}|${key}`;
    }
    console.log("Sélection", key, value);
    this.finish();
  }
  
  private selectNext(){
    this.lowlightSelected();
    let indice = Number(this.menu.dataset.indice || -1);
    console.log("Indice = %i", indice);
    indice ++;
    if (indice > this.candidatsCount) { indice = this.candidatsCount - 1;}
    this.menu.dataset.indice = String(indice);
    this.highlightSelected();
  }
  private selectPrev(){
    this.lowlightSelected();
    let indice = Number(this.menu.dataset.indice || 1) - 1; 
    console.log("Indice = %i", indice);
    if (indice < 0) { indice = 0; } 
    this.menu.dataset.indice = String(indice);
    this.highlightSelected();
  }

  private highlightSelected(){
    const indice = Number(this.menu.dataset.indice);
    this.menu.options[indice]?.classList.add('selected');
  }
  private lowlightSelected(){
    const indice = Number(this.menu.dataset.indice);
    this.menu.options[indice]?.classList.remove('selected');
  }
  private selectFirst(){
    this.menu.dataset.indice = '0';
    this.highlightSelected();
  }

  private onInput(ev: KeyboardEvent){
    ev.stopPropagation();
    switch(ev.key) {
      case 'ArrowDown':
        this.selectNext(); return stopEvent(ev);
      case 'ArrowUp':
        this.selectPrev(); return stopEvent(ev);
      case 'Enter':
        this.select(); return stopEvent(ev);
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Tab':
      case 'Shift':
        return stopEvent(ev);
    }
    const candidats = this.accessTable.filterWithText(this.input.value + ev.key);
    this.candidats = candidats;
    this.candidatsCount = candidats.length;
    this.peuple(candidats);
    return true;
  }

  private peuple(candidats: {[x: string]: string}[]) {
    this.menu.innerHTML = '';
    candidats.forEach( (candidat: any) => {
      const option = document.createElement('option');
      option.value = candidat.key;
      option.innerHTML = candidat.value;
      this.menu.appendChild(option);
    });
    this.selectFirst();
  }
  
  private observe(){
    this.input.focus();
    this.input.addEventListener('keydown', this.onInput.bind(this));
  }

  private build(){
    const o = document.createElement('div');
    this.obj = o;
    o.className = 'autocompleter';
    const input = document.createElement('input');
    o.appendChild(input);
    input.type = 'text';
    this.input = input;
    
    // Pour mettre la liste des filtrés
    const menu = document.createElement('select');
    o.appendChild(menu);
    menu.size = 15;
    this.menu = menu;
    
    document.body.appendChild(o);
  }
}