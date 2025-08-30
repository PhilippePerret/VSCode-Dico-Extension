import { UniversalCacheManager } from '../../bothside/UniversalCacheManager';
import { UOeuvre } from '../../bothside/UOeuvre';
import { App } from '../services/App';
import { StringNormalizer } from '../../bothside/StringUtils';

export interface IOeuvre {
	id: string;
	titre_affiche: string;
	titre_original?: string;
	titre_francais?: string;
	annee?: number;
	auteurs?: string;
	notes?: string;
	resume?: string;
}

export interface FullOeuvre extends IOeuvre {
  resume_formated?: string;
  titre_original?: string;
  titre_francais?: string;
  titre_affiche_formated?: string;
  titre_francais_formated?: string;
  titres: string[];                // Tous les titres combinés pour recherche
  titresLookUp: string[];          // Versions minuscules des titres (pour filtrage)
  auteurs_formated?: string;
}

export class Oeuvre extends UOeuvre {
	public static panelId = 'oeuvres';
	private static readonly REG_ARTICLES = /\b(an|a|the|le|la|les|l'|de|du)\b/i;

	public static cacheDebug() { return this.cache; }
	protected static _cacheManagerInstance: UniversalCacheManager<IOeuvre, FullOeuvre> = new UniversalCacheManager();
  protected static get cache() { return this._cacheManagerInstance; };
	public static get(oeuvre_id: string): FullOeuvre { return this.cache.get(oeuvre_id) as FullOeuvre ;}

	public static sortFonction(a: Oeuvre, b: Oeuvre): number {
		const titleA = a.titre_original || a.titre_affiche;
		const titleB = b.titre_original || b.titre_affiche;
		return titleA.localeCompare(titleB, 'fr', {
			sensitivity: 'base',
			numeric: true,
			caseFirst: 'lower'
		});
	}
	constructor(data: IOeuvre) {
		super(data);
	}
	/**
	 * Méthode pour préparation tous les items pour le cache
	 */
	public static cacheAllData(items: IOeuvre[]): void {
		this.cache.inject(items, this.prepareItemForCache.bind(this));
	}
	/**
	 * Méthode de préparation de la donnée pour le cache
	 */
	private static prepareItemForCache(item: IOeuvre): FullOeuvre {
		const preparedItem = item as FullOeuvre;
		preparedItem.titres = ["Un titre", "un autre titre", "et encore un"];
		return preparedItem;
	}

	public static async finalizeCachedItems(): Promise<void> {
		await this.cache.traverse(this.finalizeCachedItem.bind(this));
		App.incAndCheckReadyCounter();
	}
	private static finalizeCachedItem(oeuvre: FullOeuvre): FullOeuvre {
		    // Créer un array avec tous les titres disponibles
    const titres: string[] = [];

    if (oeuvre.titre_francais) { titres.push(StringNormalizer.rationalize(oeuvre.titre_francais)); }
    if (oeuvre.titre_original) { titres.push(StringNormalizer.rationalize(oeuvre.titre_original)); }
    if (oeuvre.titre_affiche) { titres.push(StringNormalizer.rationalize(oeuvre.titre_affiche)); }
  
    // Il faut supprimer les articles dans les titres
    titres.forEach(titre => {
      if ( titre.match(this.REG_ARTICLES)) {
        titres.push(titre.replace(this.REG_ARTICLES, ""));
      }
    });

    const uniqTitres: string[] = [];
    titres.forEach(titre => {
      if ( uniqTitres.includes(titre) ) { return ; }
      uniqTitres.push(titre);
    });
		// Versions minuscules pour recherche
    const titresLookUp = uniqTitres.map(titre => StringNormalizer.toLower(titre));
		
		return Object.assign(oeuvre, {
			titres: titres,
			titre_affiche_formated: oeuvre.titre_affiche,
			auteurs_formated: oeuvre.auteurs && Oeuvre.mef_auteurs(oeuvre.auteurs),
			titresLookUp: titresLookUp 
		}) as FullOeuvre;
	}

	/**
	 * Get the title to use for sorting (French if exists, otherwise original)
	 */
	get sortTitle(): string {
		return this.titre_francais || this.titre_original || this.titre_affiche;
	}

	/**
	 * Articles to ignore when generating IDs
	 */
	private static readonly ARTICLES = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'the', 'a', 'an'];

	/**
	 * Map of diacritics to their base equivalents
	 */
	private static readonly DIACRITIC_MAP: { [key: string]: string } = {
		'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
		'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
		'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
		'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
		'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
		'ý': 'y', 'ÿ': 'y',
		'ç': 'c', 'ñ': 'n',
		'œ': 'oe', 'æ': 'ae',
		// Uppercase versions
		'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
		'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
		'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
		'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
		'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
		'Ý': 'Y', 'Ÿ': 'Y',
		'Ç': 'C', 'Ñ': 'N',
		'Œ': 'OE', 'Æ': 'AE'
	};

	/**
	 * Replace diacritics with their base equivalents
	 */
	private static replaceDiacritics(text: string): string {
		return text.replace(/./g, char => this.DIACRITIC_MAP[char] || char);
	}

	/**
	 * Clean and split title into words, removing articles
	 */
	private static cleanTitle(titre: string): string[] {
		return this.replaceDiacritics(titre)
			.toLowerCase()
			.replace(/[^a-zA-Z0-9\s]/g, '') // Keep letters (both cases), numbers, spaces
			.split(/\s+/)
			.filter(word => word.length > 0 && !this.ARTICLES.includes(word));
	}

	/**
	 * Generate base ID from title
	 */
	private static generateBaseId(titre: string): string {
		const words = this.cleanTitle(titre);

		if (words.length >= 3) {
			// Take first letter of each word
			return words.map(word => word[0]).join('').toUpperCase();
		} else {
			// Take first 4 letters of combined words
			const combined = words.join('');
			return combined.substring(0, 4).toUpperCase();
		}
	}

	/**
	 * Generate unique ID with incremental length if needed
	 * Note: This method needs access to existing IDs for uniqueness check
	 */
	static generateId(titre: string, annee?: number, existingIds: Set<string> = new Set()): string {
		const baseId = this.generateBaseId(titre);
		const yearSuffix = annee ? (annee % 100).toString().padStart(2, '0') : '';

		// Start with base ID + year
		let candidateId = baseId + yearSuffix;

		// If not unique, try extending the base part
		let letterCount = baseId.length;
		const words = this.cleanTitle(titre);
		const combined = words.join('');

		while (existingIds.has(candidateId)) {
			letterCount++;

			if (words.length >= 3) {
				// For multi-word titles, add next letters cyclically
				const extendedBase = words
					.map(word => word.substring(0, Math.ceil(letterCount / words.length)))
					.join('')
					.substring(0, letterCount)
					.toUpperCase();
				candidateId = extendedBase + yearSuffix;
			} else {
				// For short titles, just extend length
				const extendedBase = combined.substring(0, letterCount).toUpperCase();
				candidateId = extendedBase + yearSuffix;
			}

			// Safety break if title is too short
			if (letterCount > combined.length + 5) {
				candidateId += Math.random().toString(36).substring(2, 5).toUpperCase();
				break;
			}
		}

		return candidateId;
	}

	/**
	 * Validate oeuvre data
	 */
	static validate(data: Partial<IOeuvre>): string[] {
		const errors: string[] = [];

		if (!data.titre_affiche?.trim()) {
			errors.push('Titre affiché requis');
		}

		if (!data.id?.trim()) {
			errors.push('ID requis');
		}

		return errors;
	}

	/**
	 * Convert to database row
	 */
	toRow(): any {
		return {
			id: this.id,
			titre_affiche: this.titre_affiche,
			titre_original: this.titre_original || null,
			titre_francais: this.titre_francais || null,
			annee: this.annee || null,
			auteurs: this.auteurs || null,
			notes: this.notes || null,
			resume: this.resume || null
		};
	}

	/**
	 * Create from database row
	 */
	static fromRow(row: IOeuvre): Oeuvre {
		return new Oeuvre(row);
	}

	/**
	 * Sort function for oeuvres (by titre_original, respecting accents/diacritics)
	 */
	static sortFunction(a:any, b:any): number {
		const titleA = a.titre_original || a.titre_affiche;
		const titleB = b.titre_original || b.titre_affiche;
		return titleA.localeCompare(titleB, 'fr', {
			sensitivity: 'base',
			numeric: true,
			caseFirst: 'lower'
		});
	}
}
