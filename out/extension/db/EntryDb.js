"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryDb = void 0;
const Entry_1 = require("../models/Entry");
class EntryDb {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    async getAll() {
        const rows = await this.dbService.all('SELECT * FROM entrees ORDER BY entree COLLATE NOCASE');
        return rows.map(row => Entry_1.Entry.fromRow(row));
    }
    async getById(id) {
        const row = await this.dbService.get('SELECT * FROM entrees WHERE id = ?', [id]);
        return row ? Entry_1.Entry.fromRow(row) : null;
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