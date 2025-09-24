import { UniversalCacheManager } from '../../bothside/UniversalCacheManager';
import { DBEntryType, EntryType, CachedEntryType, DomStateType } from '../../bothside/types';
import { App } from '../services/App';
import { StringNormalizer } from '../../bothside/StringUtils';
import { Constants } from '../../bothside/UConstants';
import { DBManager } from '../db/db_manager';
import { CanalEntry } from '../services/Rpc';

export class Entry {
	public static panelId = 'entries';

	public static cacheDebug() { return this.cache; }
	protected static _cacheManagerInstance: UniversalCacheManager<DBEntryType, EntryType> = new UniversalCacheManager();
  protected static get cache() { return this._cacheManagerInstance; };
	public static get(entry_id: string): EntryType { return this.cache.get(entry_id) as EntryType;}

	public static sortFonction(a: DBEntryType, b: DBEntryType): number {
    return a.entree.localeCompare(b.entree, 'fr', {
      sensitivity: 'base',
      numeric: true,
      caseFirst: 'lower'
    });
	}
	
	// Constructor and data access
	constructor(public data: EntryType) {}
	
	// Getters pour accès direct aux propriétés courantes
	get id(): string { return this.data.id; }
	get entree(): string { return this.data.dbData.entree; }
	get genre(): string { return this.data.dbData.genre; }
	get categorie_id(): string | undefined { return this.data.dbData.categorie_id; }
	get definition(): string { return this.data.dbData.definition; }
	
	// Méthodes statiques héritées
	static genre(genreId: string): string { return Constants.getGenre(genreId); }
	
	static getDataSerialized() {
		return this.cache.getDataSerialized();
	}
	
	static completeItemForClientAfterSave(item: any) {
		// Logique de complétion après sauvegarde
		return item;
	}

	/**
	 * Sauvegarde de l'entrée
	 */
	public static async saveItem(params: {CRId: string, item: DBEntryType, itemPrepared: EntryType, ok: boolean, errors: any, [x: string]: any}){
		const dbManager = DBManager.getInstance(App._context);
		params = await dbManager.saveItemIn('entrees', params.item, params, this);
		let itemPrepared: EntryType = this.prepareItemForCache(params.item);
		itemPrepared = this.finalizeCachedItem(itemPrepared);
		Object.assign(params, {itemPrepared: itemPrepared});
		// console.log("Params quand on revient dans Entry", params);
		// On retourne le résultat au panneau
		CanalEntry.afterSaveItem(params);
	}


	/**
	 * Méthode pour mettre simplement les données en cache sans aucun
	 * traitement (parce que pour les traiter, il faut impérativement
	 * que toutes les données soient en cache).
	 */
	public static cacheAllData(items: DBEntryType[]): void {
		this.cache.inject(items, this.prepareItemForCache.bind(this));
	}
	/**
	 * Méthode de préparation de la donnée pour le cache. Cette méthode
	 * ne procède qu'aux préparations qui ne font pas appel aux autres
	 * données (voir la méthode finalizeCachedData pour ça).
	 */
	protected static prepareItemForCache(item: DBEntryType): EntryType {
    const entreeNormalized    = StringNormalizer.toLower(item.entree);
    const entreeRationalized  = StringNormalizer.rationalize(item.entree);
	
		const cachedData: CachedEntryType = {
			itemType: 'entry',
			entree_min: entreeNormalized,
			entree_min_ra: entreeRationalized,
			genre_formated: this.genre(item.genre),
			definition_formated: item.definition
		};
		
		const domState: DomStateType = {
			display: 'block',
			selected: false
		};
		
		// console.log("'item' mis dans dbData ", structuredClone(item));
		// console.log("'item' mis dans dbData (non cloné)", item);
		// throw new Error("POUR VOIR");
		const entryType: EntryType = {
			id: item.id,  // for easy access
			dbData: item, 
			cachedData: cachedData,
			domState: domState
		};
 
		return entryType;
	}
	
	public static async finalizeCachedItems(): Promise<void> {
		await this.cache.traverse(this.finalizeCachedItem.bind(this));
		App.incAndCheckReadyCounter();
	}
	protected static finalizeCachedItem(item: EntryType): EntryType {
		// Pour trouver la catégorie humaine
		let cat:string | undefined ;
		if ( item.dbData.categorie_id ) {
			const categoryEntry = this.cache.get(item.dbData.categorie_id);
			cat = categoryEntry?.cachedData.entree_min;
		}
		
		// Mettre à jour les données cachées
		item.cachedData.categorie_formated = cat || '';
	
		return item;
	}
	/**
	 * Generate unique ID from entry text (lowercase, no accents, only letters/numbers)
	 * 
	 * TODO:
	 *      1. Ne pas supprimer les diacritics, les remplacer par leur équivalent ("ç" -> "c")
	 *      2. Demander confirmation pour l'identifiant, avec possibilité de le changer
	 *          (et donc vérification de l'unicité avant enregistrement)
	 */
	static generateId(entree: string): string {
		return entree
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Remove diacritics
			.replace(/[^a-zA-Z0-9]/g, '')
			.substring(0, 50); // Limit length
	}

	/**
	 * Convert to database row
	 */
	toRow(): any {
		return {
			id: this.id,
			entree: this.entree,
			genre: this.genre,
			categorie_id: this.categorie_id || null,
			definition: this.definition
		};
	}

	/**
	 * Post-processing after DOM elements are displayed
	 * Called after all entries are rendered in the panel
	 */
	static afterDisplayElements(): void {
		// No special post-processing needed for entries panel
		// Elements are displayed in simple list format
	}
}
