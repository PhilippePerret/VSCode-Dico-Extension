import { DatabaseService } from '../services/db/DatabaseService';
import { DBEntryType} from '../../bothside/types';

export class EntryDb {
	private dbService: DatabaseService;

	constructor(dbService: DatabaseService) {
		this.dbService = dbService;
	}

	RowsCountInDb!: number;
	async getAll(): Promise<(DBEntryType)[]> {
		// Pour connaitre le nombre exact de rangées
		let rindb = await this.dbService.get('SELECT COUNT(*) as count FROM entrees');
		this.RowsCountInDb = rindb.count;
		console.log("ENTRÉES : Nombre EXACT de rangées in DB : %i", this.RowsCountInDb);

		const rows = await this.dbService.all('SELECT * FROM entrees ORDER BY entree COLLATE NOCASE');
		console.log("ENTRÉES : Nombre de rangées relevées : %i", rows.length);
		if (rows.length !== this.RowsCountInDb) {
			throw new Error(`Divergence dans le nombre d'entrées dans la table (${this.RowsCountInDb}) et le nombre d'entrées relevées (${rows.length}).`);
		}

		return rows;
	}
}
