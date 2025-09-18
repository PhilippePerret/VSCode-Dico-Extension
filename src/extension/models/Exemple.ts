import { StringNormalizer } from '../../bothside/StringUtils';
import { UExemple } from '../../bothside/UExemple';
import { UniversalCacheManager } from '../../bothside/UniversalCacheManager';
import { DBManager } from '../db/db_manager';
import { App } from '../services/App';
import { CanalExemple } from '../services/Rpc';
import { Entry, FullEntry } from './Entry';
import { Oeuvre, FullOeuvre } from './Oeuvre';

// La donnée persistante
export interface IExemple {
	id: string;
	oeuvre_id: string;
	indice: number;
	entry_id: string;
	content: string;
	notes?: string;
}
 
export interface FullExemple extends IExemple {
	itemType: 'entry' | 'oeuvre' | 'exemple';
	content_formated: string;
  content_min: string;             // Version minuscules pour recherche
  content_min_ra: string;          // Version rationalisée (sans accents)
  oeuvre_titre: string;            // Titre de l'oeuvre
	entree_formated: string;
	titresLookUp: string[];			// pour le filtrage par titre d'oeuvre
	entry4filter: string;				// version optimisée pour le filtrage
}

// La donnée telle qu'elle sera en cache
export class Exemple extends UExemple {
	public static panelId = 'exemples';

	public static cacheDebug() { return this.cache; } // Pour les tests
	protected static _cacheManagerInstance: UniversalCacheManager<IExemple, FullExemple> = new UniversalCacheManager();
  protected static get cache() { return this._cacheManagerInstance; };


	public static sortFonction(a: Exemple, b: Exemple): number {
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
	public static async saveExemple(params: {CRId: string, item: IExemple, ok: boolean, errors: any, [x: string]: any}){
		const dbManager = DBManager.getInstance(App._context);
		params = await dbManager.saveItemIn('exemples', params.item, params, this);
		CanalExemple.afterSaveItem(params);
	}


	constructor(data: IExemple) {
		super(data);
		this.id = `${this.oeuvre_id}-${this.indice}`;
	}

	public static cacheAllData(items: IExemple[]): void {
		this.cache.inject(items, this.prepareItemForCache.bind(this));
	}
	protected static prepareItemForCache(item: IExemple): FullExemple {
		const preparedItem = item as FullExemple;
		Object.assign(preparedItem, {
			itemType: 'exemple',
		});
		return preparedItem;
	}

	public static async finalizeCachedItems(): Promise<void> {
		await this.cache.traverse(this.finalizeCachedItem.bind(this));
		App.incAndCheckReadyCounter();
	}
	protected static finalizeCachedItem(item: FullExemple): FullExemple {
		const entry = Entry.get(item.entry_id);
		const entree = entry.entree_min;
		const oeuvre = Oeuvre.get(item.oeuvre_id);
		const titre_oeuvre = oeuvre.titre_affiche;
		// On remplace 'TITRE' dans le texte de l'exemple
		let content_formated: string;
		if (item.content.match(/TITRE/) ){
			content_formated = item.content.replace(/TITRE/g, titre_oeuvre);
		} else {
			content_formated = `dans ${titre_oeuvre}, ${item.content}`;
		} 
		return Object.assign(item, {
			oeuvre_titre: titre_oeuvre,
			entree_formated: entree,
			content_formated: content_formated,
			content_min: StringNormalizer.toLower(content_formated),
			content_min_ra: StringNormalizer.rationalize(content_formated),
			titresLookUp: oeuvre.titresLookUp,
			entry4filter: entry.entree_min 
		});
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
	 * Create from database row
	 */
	static fromRow(row: IExemple): Exemple | undefined {
		try {
			return new Exemple(row);
		} catch(erreur) {
			console.error("# ERREUR avec l'EXEMPLE : %s", erreur, row);
		}
	
	}

	/**
	 * Sort function for exemples (by oeuvre_id then by indice)
	 */
	static sortFunction(a:any, b:any): number {
		// First sort by oeuvre ID (oeuvre_id)
		const oeuvreComparison = a.oeuvre_id.localeCompare(b.oeuvre_id);
		if (oeuvreComparison !== 0) { return oeuvreComparison; }
		// Then sort by indice
		return a.indice - b.indice;
	}
}