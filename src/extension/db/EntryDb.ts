import { DatabaseService } from '../services/db/DatabaseService';
import { Entry, DBEntryType } from '../models/Entry';

export class EntryDb {
    private dbService: DatabaseService;

    constructor(dbService: DatabaseService) {
        this.dbService = dbService;
    }

		RowsCountInDb!: number;
    async getAll(): Promise<(Entry | null)[]> {
			// Pour connaitre le nombre exact de rangées
        let rindb = await this.dbService.get('SELECT COUNT(*) FROM entrees');
        this.RowsCountInDb = rindb['COUNT(*)'];
        console.log("ENTRÉES : Nombre EXACT de rangées in DB : %i", this.RowsCountInDb);
 
        const rows = await this.dbService.all('SELECT * FROM entrees ORDER BY entree COLLATE NOCASE');
        console.log("ENTRÉES : Nombre de rangées relevées : %i", rows.length);
        if ( rows.length !== this.RowsCountInDb) {
            throw new Error(`Divergence dans le nombre d'entrées dans la table (${this.RowsCountInDb}) et le nombre d'entrées relevées (${rows.length}).`);
        }
 
        return rows.map(row => Entry.fromRow(row) || null );
    }

    async getById(id: string): Promise<Entry | null> {
        const row = await this.dbService.get('SELECT * FROM entrees WHERE id = ?', [id]);
        return row ? Entry.fromRow(row) || null : null;
    }

    async create(entry: Entry): Promise<void> {
        const row = entry.toRow();
        await this.dbService.run(
            'INSERT INTO entrees (id, entree, genre, categorie_id, definition) VALUES (?, ?, ?, ?, ?)',
            [row.id, row.entree, row.genre, row.categorie_id, row.definition]
        );
    }

    async update(entry: Entry): Promise<void> {
        const row = entry.toRow();
        await this.dbService.run(
            'UPDATE entrees SET entree = ?, genre = ?, categorie_id = ?, definition = ? WHERE id = ?',
            [row.entree, row.genre, row.categorie_id, row.definition, row.id]
        );
    }

    async delete(id: string): Promise<void> {
        await this.dbService.run('DELETE FROM entrees WHERE id = ?', [id]);
    }

    async exists(id: string): Promise<boolean> {
        const row = await this.dbService.get('SELECT 1 FROM entrees WHERE id = ? LIMIT 1', [id]);
        return !!row;
    }
}
