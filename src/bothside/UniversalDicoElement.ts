import { UniversalCacheManager } from "./UniversalCacheManager";

// Les données brutes telles qu'elles sont relevées dans la base
export interface RawData {
  id: string;
  [key: string]: any;
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
  protected static prepareItemForCache(item: any): any {};
  protected static finalizeCachedItem(item: any): any {};

  public static completeItemForClientAfterSave(item: any){
    let pItem = this.prepareItemForCache(item);
    pItem = this.finalizeCachedItem(pItem);
    return pItem;
  }

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