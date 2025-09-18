import { DatabaseService } from '../services/db/DatabaseService';
import { Exemple, DBExempleType } from '../models/Exemple';

export class ExempleDb {
    private dbService: DatabaseService;

    constructor(dbService: DatabaseService) {
        this.dbService = dbService;
    }

    RowsCountInDb!: number;
    async getAll(): Promise<(Exemple | null)[]> {
        // Pour connaitre le nombre exact de rangées
        let rindb = await this.dbService.get('SELECT COUNT(*) FROM exemples');
        this.RowsCountInDb = rindb['COUNT(*)'];
        console.log("EXEMPLES : Nombre EXACT de rangées in DB : %i", this.RowsCountInDb);
 
        const rows = await this.dbService.all(`
            SELECT e.* FROM exemples e
            JOIN oeuvres f ON e.oeuvre_id = f.id
            ORDER BY 
                CASE WHEN f.titre_francais IS NOT NULL THEN f.titre_francais ELSE f.titre_original END COLLATE NOCASE,
                e.indice
        `);
        console.log("EXEMPLES : Nombre de rangées relevées : %i", rows.length);
        if ( rows.length !== this.RowsCountInDb) {
						console.error("Toutes les données exemples ne sont pas remontées. La raison peut être que l'oeuvre_id ne correspond à aucune oeuvre pour certains exemples.");
            throw new Error(`### EXEMPLES ### Divergence dans le nombre d'exemples dans la table (${this.RowsCountInDb}) et le nombre d'exemples relevées (${rows.length}).`);
        }
 
        return rows.map(row => Exemple.fromRow(row) || null);
    }

    async create(exemple: Exemple): Promise<void> {
        const row = exemple.toRow();
        await this.dbService.run(
            'INSERT INTO exemples (oeuvre_id, indice, entry_id, content, notes) VALUES (?, ?, ?, ?, ?)',
            [row.oeuvre_id, row.indice, row.entry_id, row.content, row.notes]
        );
    }

    async update(exemple: Exemple): Promise<void> {
        const row = exemple.toRow();
        await this.dbService.run(
            'UPDATE exemples SET entry_id = ?, content = ?, notes = ? WHERE oeuvre_id = ? AND indice = ?',
            [row.entry_id, row.content, row.notes, row.oeuvre_id, row.indice]
        );
    }

    async delete(oeuvreId: string, indice: number): Promise<void> {
        await this.dbService.run('DELETE FROM exemples WHERE oeuvre_id = ? AND indice = ?', [oeuvreId, indice]);
    }

    async exists(oeuvreId: string, indice: number): Promise<boolean> {
        const row = await this.dbService.get(
            'SELECT 1 FROM exemples WHERE oeuvre_id = ? AND indice = ? LIMIT 1',
            [oeuvreId, indice]
        );
        return !!row;
    }
}
