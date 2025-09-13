import { UEntry } from '../../bothside/UEntry';
import { UniversalCacheManager } from '../../bothside/UniversalCacheManager';
import { App } from '../services/App';
import { StringNormalizer } from '../../bothside/StringUtils';
import { CanalEntry } from '../services/Rpc';
import { DBManager } from '../db/db_manager';

// Forme de la donnée persistante (en tout cas celle
// qui sera envoyée au cache)
export interface IEntry {
	id: string;
	entree: string;
	genre: string;
	categorie_id?: string;
	definition: string;
}

// TODO C'est l'interface qui est utilisé aussi côté webview, il
// faut donc mettre cette donnée dans la partie bothside
// La donnée cachée, complète
export interface FullEntry extends IEntry {
  entree_min: string;              // Version minuscules pour recherche
  entree_min_ra: string;           // Version rationalisée (sans accents) 
  categorie_formated?: string;     // Nom de la catégorie (résolu via Entry.get())
  genre_formated?: string;
	definition_formated?: string;
	selected: boolean;
	display: 'block' | 'none';
}

// Classe de la donnée mise en cache
export class Entry extends UEntry {
	public static panelId: string = 'entries';

	public static cacheDebug() { return this.cache; }
	protected static _cacheManagerInstance: UniversalCacheManager<IEntry, FullEntry> = new UniversalCacheManager();
  protected static get cache() { return this._cacheManagerInstance; };
	public static get(entry_id: string): FullEntry { return this.cache.get(entry_id) as FullEntry;}

	public static sortFonction(a: Entry, b: Entry): number {
    return a.entree.localeCompare(b.entree, 'fr', {
      sensitivity: 'base',
      numeric: true,
      caseFirst: 'lower'
    });
	}

	public  static async saveItem(params: {CRId: string, item: IEntry, ok?: boolean, errors?: any}){
		console.log("Je reçois l'item à sauver dans Entry", params);
		Object.assign(params, {ok: true, errors: null});
		try {
			const dbManager = DBManager.getInstance(App._context);
			params = await dbManager.saveEntry(params.item, params);
		} catch(erreur) {
			params.ok = false;
			params.errors = [erreur];	
		}
		// On retourne au panneau
		CanalEntry.afterSaveItem(params);
	}

	constructor(data: IEntry) {
		super(data);
	}

	/**
	 * Méthode pour mettre simplement les données en cache sans aucun
	 * traitement (parce que pour les traiter, il faut impérativement
	 * que toutes les données sont en cache).
	 */
	public static cacheAllData(items: IEntry[]): void {
		this.cache.inject(items, this.prepareItemForCache.bind(this));
	}
	/**
	 * Méthode de préparation de la donnée pour le cache. Cette méthode
	 * ne procède qu'aux préparations qui ne font pas appel aux autres
	 * données (voir la méthode finalizeCachedData pour ça).
	 */
	private static prepareItemForCache(item: IEntry): FullEntry {
    const entreeNormalized    = StringNormalizer.toLower(item.entree);
    const entreeRationalized  = StringNormalizer.rationalize(item.entree);
	// On finalise la donnée en cache
		const pItem = Object.assign(item, {
			display: 'block',
			selected: false,
			entree_min: entreeNormalized,
			entree_min_ra: entreeRationalized,
			genre_formated: this.genre(item.genre),
			definition_formated: item.definition // pour le moment
		}) as FullEntry;
 
		return pItem;
	}
	
	public static async finalizeCachedItems(): Promise<void> {
		await this.cache.traverse(this.finalizeCachedItem.bind(this));
		App.incAndCheckReadyCounter();
	}
	private static finalizeCachedItem(item: FullEntry): FullEntry {
		// Pour trouver la catégorie humaine
		let cat:string | undefined ;
		if ( item.categorie_id ) {
			cat = this.cache.get(item.categorie_id)?.entree_min;
		}
		item = Object.assign(item, {
			categorie_format: cat || '',
		});
	
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
	 * Create from database row
	 */
	static fromRow(row: any): Entry | undefined {
		try {
			return new Entry(row); 
		} catch(erreur) {
			console.error("# ERREUR avec L'entrée : %s", erreur, row);
		}
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
