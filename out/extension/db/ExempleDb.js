"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExempleDb = void 0;
const Exemple_1 = require("../models/Exemple");
class ExempleDb {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    async getAll() {
        const rows = await this.dbService.all(`
            SELECT e.* FROM exemples e
            JOIN oeuvres f ON e.oeuvre_id = f.id
            ORDER BY 
                CASE WHEN f.titre_francais IS NOT NULL THEN f.titre_francais ELSE f.titre_original END COLLATE NOCASE,
                e.indice
        `);
        return rows.map(row => Exemple_1.Exemple.fromRow(row));
    }
    async create(exemple) {
        const row = exemple.toRow();
        await this.dbService.run('INSERT INTO exemples (oeuvre_id, indice, entry_id, content, notes) VALUES (?, ?, ?, ?, ?)', [row.oeuvre_id, row.indice, row.entry_id, row.content, row.notes]);
    }
    async update(exemple) {
        const row = exemple.toRow();
        await this.dbService.run('UPDATE exemples SET entry_id = ?, content = ?, notes = ? WHERE oeuvre_id = ? AND indice = ?', [row.entry_id, row.content, row.notes, row.oeuvre_id, row.indice]);
    }
    async delete(oeuvreId, indice) {
        await this.dbService.run('DELETE FROM exemples WHERE oeuvre_id = ? AND indice = ?', [oeuvreId, indice]);
    }
    async exists(oeuvreId, indice) {
        const row = await this.dbService.get('SELECT 1 FROM exemples WHERE oeuvre_id = ? AND indice = ? LIMIT 1', [oeuvreId, indice]);
        return !!row;
    }
}
exports.ExempleDb = ExempleDb;
//# sourceMappingURL=ExempleDb.js.map