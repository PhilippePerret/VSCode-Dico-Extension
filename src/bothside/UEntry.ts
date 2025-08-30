/**
 * Ce module contient les éléments utiles aussi bien côté extension (serveur)
 * que côté client (webview)
 */
import { Constants } from './UConstants';
import { Entry } from '../extension/models/Entry';
import { UniversalDicoElement } from './UniversalDicoElement';

const GENRES: { [x: string]: string } = Constants.ENTRIES_GENRES;


export class UEntry extends UniversalDicoElement {
  [key: string]: any;
  static klass = Entry;

  static readonly names: {[k:string]: {sing: string, plur: string}} = {
      min: { sing: "entrée", plur: "entrées"},
      maj: { sing: "ENTRÉE", plur: "ENTRÉES"},
      tit: { sing: "Entrée", plur: "Entrées"},
      tech: { sing: "entry", plur: "entries"}
  };
  
  static genre(id:string):string { return GENRES[id as keyof typeof GENRES];}

  constructor(data: {[key: string]: any}){
    super(data);
    // TODO D'autres traitement ici propres à l'élément, sinon le
    // constructeur ne se justifie pas.
  }

}