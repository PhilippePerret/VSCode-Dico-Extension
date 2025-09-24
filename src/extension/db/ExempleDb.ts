import { DatabaseService } from '../services/db/DatabaseService';
import { DBExempleType } from '../../bothside/types';

export class ExempleDb {
	private dbService: DatabaseService;

	constructor(dbService: DatabaseService) {
		this.dbService = dbService;
	}

	RowsCountInDb!: number;
	async getAll(): Promise<(DBExempleType | null)[]> {
		// Pour connaitre le nombre exact de rangées
		let rindb = await this.dbService.get('SELECT COUNT(*) as count FROM exemples');
		this.RowsCountInDb = rindb.count;
		console.log("EXEMPLES : Nombre EXACT de rangées in DB : %i", this.RowsCountInDb);

		const rows = await this.dbService.all(`
            SELECT e.* FROM exemples e
            JOIN oeuvres f ON e.oeuvre_id = f.id
            ORDER BY 
                CASE WHEN f.titre_francais IS NOT NULL THEN f.titre_francais ELSE f.titre_original END COLLATE NOCASE,
                e.indice
        `);
		console.log("EXEMPLES : Nombre de rangées relevées : %i", rows.length);
		if (rows.length !== this.RowsCountInDb) {
			console.error("Toutes les données exemples ne sont pas remontées. La raison peut être que l'oeuvre_id ne correspond à aucune oeuvre pour certains exemples.");
			throw new Error(`### EXEMPLES ### Divergence dans le nombre d'exemples dans la table (${this.RowsCountInDb}) et le nombre d'exemples relevées (${rows.length}).`);
		}

		return rows;
	}
}
