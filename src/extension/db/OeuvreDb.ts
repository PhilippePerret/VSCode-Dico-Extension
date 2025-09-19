import { DBOeuvreType } from '../../bothside/types';
import { DatabaseService } from '../services/db/DatabaseService';

export class OeuvreDb {
	private dbService: DatabaseService;

	constructor(dbService: DatabaseService) {
		this.dbService = dbService;
	}

	RowsCountInDb!: number;
	async getAll(): Promise<(DBOeuvreType | null)[]> {
		// Pour connaitre le nombre exact de rangées
		let rindb = await this.dbService.get('SELECT COUNT(*) AS count FROM oeuvres');
		this.RowsCountInDb = rindb.count;
		console.log("OEUVRES : Nombre EXACT de rangées in DB : %i", this.RowsCountInDb);

		const rows = await this.dbService.all(`
            SELECT * FROM oeuvres 
            ORDER BY 
                CASE WHEN titre_francais IS NOT NULL THEN titre_francais ELSE titre_original END COLLATE NOCASE
        `);
		console.log("OEUVRES : Nombre de rangées relevées : %i", rows.length);
		if (rows.length !== this.RowsCountInDb) {
			throw new Error(`Divergence dans le nombre d'œuvres dans la table (${this.RowsCountInDb}) et le nombre d'œuvres relevées (${rows.length}).`);
		}
		return rows;
	}
}
