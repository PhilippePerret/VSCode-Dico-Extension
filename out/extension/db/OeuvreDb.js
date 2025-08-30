"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OeuvreDb = void 0;
const Oeuvre_1 = require("../models/Oeuvre");
class OeuvreDb {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    async getAll() {
        const rows = await this.dbService.all(`
            SELECT * FROM oeuvres 
            ORDER BY 
                CASE WHEN titre_francais IS NOT NULL THEN titre_francais ELSE titre_original END COLLATE NOCASE
        `);
        return rows.map(row => Oeuvre_1.Oeuvre.fromRow(row));
    }
    async getById(id) {
        const row = await this.dbService.get('SELECT * FROM oeuvres WHERE id = ?', [id]);
        return row ? Oeuvre_1.Oeuvre.fromRow(row) : null;
    }
    async create(oeuvre) {
        const row = oeuvre.toRow();
        await this.dbService.run('INSERT INTO oeuvres (id, titre_affiche, titre_original, titre_francais, annee, auteurs, notes, resume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [row.id, row.titre_affiche, row.titre_original, row.titre_francais, row.annee, row.auteurs, row.notes, row.resume]);
    }
    async update(oeuvre) {
        const row = oeuvre.toRow();
        await this.dbService.run('UPDATE oeuvres SET titre_affiche = ?, titre_original = ?, titre_francais = ?, annee = ?, auteurs = ?, notes = ?, resume = ? WHERE id = ?', [row.titre_affiche, row.titre_original, row.titre_francais, row.annee, row.auteurs, row.notes, row.resume, row.id]);
    }
    async delete(id) {
        await this.dbService.run('DELETE FROM oeuvres WHERE id = ?', [id]);
    }
    async search(searchTerm) {
        const rows = await this.dbService.all(`
            SELECT * FROM oeuvres 
            WHERE titre_affiche LIKE ? OR titre_original LIKE ? OR titre_francais LIKE ?
            ORDER BY 
                CASE WHEN titre_francais IS NOT NULL THEN titre_francais ELSE titre_original END COLLATE NOCASE
        `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
        return rows.map(row => Oeuvre_1.Oeuvre.fromRow(row));
    }
    async getAllIds() {
        const rows = await this.dbService.all('SELECT id FROM oeuvres');
        return new Set(rows.map(row => row.id));
    }
    async exists(id) {
        const row = await this.dbService.get('SELECT 1 FROM oeuvres WHERE id = ? LIMIT 1', [id]);
        return !!row;
    }
}
exports.OeuvreDb = OeuvreDb;
//# sourceMappingURL=OeuvreDb.js.map