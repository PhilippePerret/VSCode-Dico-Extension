import { Oeuvre } from '../models/Oeuvre';
import { DatabaseService } from '../services/db/DatabaseService';

export class OeuvreDb {
    private dbService: DatabaseService;

    constructor(dbService: DatabaseService) {
        this.dbService = dbService;
    }

    RowsCountInDb!: number;
    async getAll(): Promise<(Oeuvre | null)[]> {
        // Pour connaitre le nombre exact de rangées
        let rindb = await this.dbService.get('SELECT COUNT(*) FROM oeuvres');
        this.RowsCountInDb = rindb['COUNT(*)'];
        console.log("OEUVRES : Nombre EXACT de rangées in DB : %i", this.RowsCountInDb);
        
        const rows = await this.dbService.all(`
            SELECT * FROM oeuvres 
            ORDER BY 
                CASE WHEN titre_francais IS NOT NULL THEN titre_francais ELSE titre_original END COLLATE NOCASE
        `);
        console.log("OEUVRES : Nombre de rangées relevées : %i", rows.length);
        if ( rows.length !== this.RowsCountInDb) {
            throw new Error(`Divergence dans le nombre d'œuvres dans la table (${this.RowsCountInDb}) et le nombre d'œuvres relevées (${rows.length}).`);
        }
        return rows.map(row => Oeuvre.fromRow(row) || null);
    }

    async getById(id: string): Promise<Oeuvre | null> {
        const row = await this.dbService.get('SELECT * FROM oeuvres WHERE id = ?', [id]);
        return row ? Oeuvre.fromRow(row) || null : null;
    }

    async create(oeuvre: Oeuvre): Promise<void> {
        const row = oeuvre.toRow();
        await this.dbService.run(
            'INSERT INTO oeuvres (id, titre_affiche, titre_original, titre_francais, annee, auteurs, notes, resume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [row.id, row.titre_affiche, row.titre_original, row.titre_francais, row.annee, row.auteurs, row.notes, row.resume]
        );
    }

    async update(oeuvre: Oeuvre): Promise<void> {
        const row = oeuvre.toRow();
        await this.dbService.run(
            'UPDATE oeuvres SET titre_affiche = ?, titre_original = ?, titre_francais = ?, annee = ?, auteurs = ?, notes = ?, resume = ? WHERE id = ?',
            [row.titre_affiche, row.titre_original, row.titre_francais, row.annee, row.auteurs, row.notes, row.resume, row.id]
        );
    }

    async delete(id: string): Promise<void> {
        await this.dbService.run('DELETE FROM oeuvres WHERE id = ?', [id]);
    }

    async search(searchTerm: string): Promise<(Oeuvre | null)[]> {
        const rows = await this.dbService.all(`
            SELECT * FROM oeuvres 
            WHERE titre_affiche LIKE ? OR titre_original LIKE ? OR titre_francais LIKE ?
            ORDER BY 
                CASE WHEN titre_francais IS NOT NULL THEN titre_francais ELSE titre_original END COLLATE NOCASE
        `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
        return rows.map(row => Oeuvre.fromRow(row) || null  );
    }

    async getAllIds(): Promise<Set<string>> {
        const rows = await this.dbService.all('SELECT id FROM oeuvres');
        return new Set(rows.map(row => row.id));
    }

    async exists(id: string): Promise<boolean> {
        const row = await this.dbService.get('SELECT 1 FROM oeuvres WHERE id = ? LIMIT 1', [id]);
        return !!row;
    }
}
