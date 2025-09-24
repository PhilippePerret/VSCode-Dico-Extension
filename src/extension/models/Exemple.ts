import { StringNormalizer } from '../../bothside/StringUtils';
import { UniversalCacheManager } from '../../bothside/UniversalCacheManager';
import { DBManager } from '../db/db_manager';
import { App } from '../services/App';
import { CanalExemple } from '../services/Rpc';
import { DBExempleType, ExempleType} from '../../bothside/types';
import { Entry } from './Entry';
import { Oeuvre } from './Oeuvre';



export class Exemple {
	public static panelId = 'exemples';

	public static cacheDebug() { return this.cache; } // Pour les tests
	protected static _cacheManagerInstance: UniversalCacheManager<DBExempleType, ExempleType> = new UniversalCacheManager();
  protected static get cache() { return this._cacheManagerInstance; };

	/**
	 * Sauvegarde de l'exemple
	 */
	public static async saveItem(params: {CRId: string, item: DBExempleType, itemPrepared: ExempleType, ok: boolean, errors: any, [x: string]: any}){
		const dbManager = DBManager.getInstance(App._context);
		params = await dbManager.saveItemIn('exemples', params.item, params, this);
		let itemPrepared: ExempleType = this.prepareItemForCache(params.item);
		itemPrepared = this.finalizeCachedItem(itemPrepared);
		Object.assign(params, {itemPrepared: itemPrepared});
		CanalExemple.afterSaveItem(params);
	}


	// Constructor and data access
	constructor(public data: ExempleType) {
		// console.log("data dans constructor Exemple", structuredClone(data));
		// throw new Error("pour voir");
	}
	
	// Getters pour accès direct aux propriétés courantes
	get id(): string { return this.data.id; }
	get oeuvre_id(): string { return this.data.dbData.oeuvre_id; }
	get indice(): number { return this.data.dbData.indice; }
	get entry_id(): string { return this.data.dbData.entry_id; }
	get content(): string { return this.data.dbData.content; }
	get notes(): string | undefined { return this.data.dbData.notes; }
	
	// Méthodes statiques héritées
	static getDataSerialized() {
		return this.cache.getDataSerialized();
	}
	
	static completeItemForClientAfterSave(item: any) {
		// Logique de complétion après sauvegarde
		return item;
	}

	public static sortFonction(a: DBExempleType, b: DBExempleType): number {
    // First sort by oeuvre ID (oeuvre_id)
    const oeuvreComparison = a.oeuvre_id.localeCompare(b.oeuvre_id);
    if (oeuvreComparison !== 0) {
      return oeuvreComparison;
    }
    return a.indice - b.indice;
	}
	/**
	 * @api
	 * 
	 * Sauvegarde de l'exemple 
	 */
	public static async saveExemple(params: {CRId: string, item: DBExempleType, ok: boolean, errors: any, [x: string]: any}){
		const dbManager = DBManager.getInstance(App._context);
		params = await dbManager.saveItemIn('exemples', params.item, params, this);
		CanalExemple.afterSaveItem(params);
	}

	public static cacheAllData(items: DBExempleType[]): void {
		this.cache.inject(items, this.prepareItemForCache.bind(this));
	}
	protected static prepareItemForCache(item: DBExempleType): ExempleType {
		const exId = `${item.oeuvre_id}-${item.indice}`;
		return {
			id: exId,
			dbData: item,
			cachedData: {
				id: exId,
				itemType: 'exemple',
				content_formated: '',
				content_min: '',
				content_min_ra: '',
				oeuvre_titre: '',
				entree_formated: '',
				titresLookUp: [],
				entry4filter: ''
			},
			domState: {
				selected: false,
				display: 'block'
			}
		};
	}

	public static async finalizeCachedItems(): Promise<void> {
		await this.cache.traverse(this.finalizeCachedItem.bind(this));
		App.incAndCheckReadyCounter();
	}
	protected static finalizeCachedItem(item: ExempleType): ExempleType {
		const entry = Entry.get(item.dbData.entry_id);
		const entree = entry.cachedData.entree_min;
		const oeuvre = Oeuvre.get(item.dbData.oeuvre_id);
		const titre_oeuvre = oeuvre.dbData.titre_affiche;
		// On remplace 'TITRE' dans le texte de l'exemple
		let content_formated: string;
		if (item.dbData.content.match(/TITRE/) ){
			content_formated = item.dbData.content.replace(/TITRE/g, titre_oeuvre);
		} else {
			content_formated = `dans ${titre_oeuvre}, ${item.dbData.content}`;
		} 
		Object.assign(item.cachedData, {
			oeuvre_titre: titre_oeuvre,
			entree_formated: entree,
			content_formated: content_formated,
			content_min: StringNormalizer.toLower(content_formated),
			content_min_ra: StringNormalizer.rationalize(content_formated),
			titresLookUp: oeuvre.cachedData.titresLookUp,
			entry4filter: entry.cachedData.entree_min
		});
		return item;
	}

	/**
	 * Convert to database row
	 */
	toRow(): any {
		return {
			id: this.id, // Include computed id for webview
			oeuvre_id: this.oeuvre_id,
			indice: this.indice,
			entry_id: this.entry_id,
			content: this.content,
			notes: this.notes || null
		};
	}

	/**
	 * Sort function for exemples (by oeuvre_id then by indice)
	 */
	static sortFunction(a:DBExempleType, b:DBExempleType): number {
		// First sort by oeuvre ID (oeuvre_id)
		const oeuvreComparison = a.oeuvre_id.localeCompare(b.oeuvre_id);
		if (oeuvreComparison !== 0) { return oeuvreComparison; }
		// Then sort by indice
		return a.indice - b.indice;
	}
}