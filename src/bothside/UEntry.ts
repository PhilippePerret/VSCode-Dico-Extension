/**
 * Ce module contient les éléments utiles aussi bien côté extension (serveur)
 * que côté client (webview)
 */
import { Entry } from '../extension/models/Entry';
import { UniversalDicoElement } from './UniversalDicoElement';

export class UEntry extends UniversalDicoElement {
  [key: string]: any;
  static klass = Entry;

  static readonly names: {[k:string]: {sing: string, plur: string}} = {
      min: { sing: "entrée", plur: "entrées"},
      maj: { sing: "ENTRÉE", plur: "ENTRÉES"},
      tit: { sing: "Entrée", plur: "Entrées"},
      tech: { sing: "entry", plur: "entries"}
  };
  
   static readonly GENRES = {
    'nm': 'n.m.',
    'nf': 'n.f.',
    'np': 'n.pl.',
    'vb': 'verbe',
    'adj': 'adj.',
    'adv': 'adv.'
  };

  static genre(id:string):string { return this.GENRES[id as keyof typeof this.GENRES];}

  constructor(data: {[key: string]: any}){
    super(data);
    // TODO D'autres traitement ici propres à l'élément, sinon le
    // constructeur ne se justifie pas.
  }

}