"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryDb = void 0;
const Entry_1 = require("../models/Entry");
class EntryDb {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    RowsCountInDb;
    async getAll() {
        // Pour connaitre le nombre exact de rangées
        let rindb = await this.dbService.get('SELECT COUNT(*) FROM entrees');
        this.RowsCountInDb = rindb['COUNT(*)'];
        console.log("ENTRÉES : Nombre EXACT de rangées in DB : %i", this.RowsCountInDb);
        const rows = await this.dbService.all('SELECT * FROM entrees ORDER BY entree COLLATE NOCASE');
        console.log("ENTRÉES : Nombre de rangées relevées : %i", rows.length);
        if (rows.length !== this.RowsCountInDb) {
            throw new Error(`Divergence dans le nombre d'entrées dans la table (${this.RowsCountInDb}) et le nombre d'entrées relevées (${rows.length}).`);
        }
        return rows.map(row => Entry_1.Entry.fromRow(row) || null);
    }
    async getById(id) {
        const row = await this.dbService.get('SELECT * FROM entrees WHERE id = ?', [id]);
        return row ? Entry_1.Entry.fromRow(row) || null : null;
    }
    async create(entry) {
        const row = entry.toRow();
        await this.dbService.run('INSERT INTO entrees (id, entree, genre, categorie_id, definition) VALUES (?, ?, ?, ?, ?)', [row.id, row.entree, row.genre, row.categorie_id, row.definition]);
    }
    async update(entry) {
        const row = entry.toRow();
        await this.dbService.run('UPDATE entrees SET entree = ?, genre = ?, categorie_id = ?, definition = ? WHERE id = ?', [row.entree, row.genre, row.categorie_id, row.definition, row.id]);
    }
    async delete(id) {
        await this.dbService.run('DELETE FROM entrees WHERE id = ?', [id]);
    }
    async exists(id) {
        const row = await this.dbService.get('SELECT 1 FROM entrees WHERE id = ? LIMIT 1', [id]);
        return !!row;
    }
}
exports.EntryDb = EntryDb;
//# sourceMappingURL=EntryDb.js.map