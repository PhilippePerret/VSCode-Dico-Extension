import { AnyElementClass } from "../extension/models/AnyElement";
import { UniversalCacheManager } from "./UniversalCacheManager";
import { TypeUnionElement } from "./UnversalConstants";

// Les données brutes telles qu'elles sont relevées dans la base
export interface RawData {
  id: string;
  [key: string]: any;
}

// Les données travaillées et mise en cache
export interface CachedItem {
  id: string;
  [key: string]: any;
  classe: TypeUnionElement;
}

/**
 * Class Universelle pour un Element quelconque
 * 
 * Signifie que ça sert :
 *  - Côté Extension/Côté Webview (server/client)
 *  - Pour les Entry, Oeuvre et Exemples
 * 
 */
export abstract class UniversalDicoElement {
  [key: string]: any; // autorise `this[k]' dans le constructeur
protected static cache: UniversalCacheManager<any, any>; 

  // Le constructeur reçoit toujours un objet contenant
  // Les données. Dans un cas (extension) ce sont les données
  // provenant de la base de données, dans l'autre cas (webview)
  // ce sont les données cachées et préparées
  constructor(data: {[key: string]: any} ){
    for ( const k in data) {
      if (Object.prototype.hasOwnProperty.call(data, k)) { this[k] = data[k]; }
    }
  }

  static getDataSerialized(){ 
    return this.cache.getDataSerialized();
  }
}