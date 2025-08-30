"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class DatabaseService {
    static instance = null;
    db = null;
    dbPath;
    constructor(context, isTest = false) {
        const dbName = isTest ? 'dico-test.db' : 'dico.db';
        if (isTest) {
            // Pour les tests, utiliser un dossier persistant dans le projet
            this.dbPath = path.join(context.extensionPath, 'test-data', dbName);
        }
        else {
            this.dbPath = path.join(context.globalStorageUri?.fsPath || context.extensionPath, dbName);
        }
        // Ensure directory exists
        const dir = path.dirname(this.dbPath);
        if (false === fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    /**
     * Get singleton instance
     */
    static getInstance(context, isTest = false) {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService(context, isTest);
        }
        return DatabaseService.instance;
    }
    /**
     * Reset singleton instance (for testing and forced reloading)
     */
    static async reset() {
        if (DatabaseService.instance) {
            await DatabaseService.instance.close();
        }
        DatabaseService.instance = null;
    }
    /**
     * Initialize database connection and create tables
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(new Error(`Failed to open database: ${err.message}`));
                    return;
                }
                this.createTables()
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }
    /**
     * Create database tables with proper schema
     */
    async createTables() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        // Check if migration is needed
        await this.handleMigrations();
        const queries = [
            // Enable foreign keys
            `PRAGMA foreign_keys = ON`,
            // entrees table (dictionary)
            `CREATE TABLE IF NOT EXISTS entrees (
                id TEXT PRIMARY KEY,
                entree TEXT NOT NULL COLLATE NOCASE,
                genre TEXT,
                categorie_id TEXT,
                definition TEXT NOT NULL
            )`,
            // Oeuvres table
            `CREATE TABLE IF NOT EXISTS oeuvres (
                id TEXT PRIMARY KEY,
                titre_affiche TEXT NOT NULL,
                titre_original TEXT,
                titre_francais TEXT,
                annee INTEGER,
                auteurs TEXT,
                notes TEXT,
                resume TEXT
            )`,
            // exemples table
            `CREATE TABLE IF NOT EXISTS exemples (
                oeuvre_id TEXT,
                indice INTEGER,
                entry_id TEXT,
                content TEXT NOT NULL,
                notes TEXT,
                PRIMARY KEY (oeuvre_id, indice)
            )`,
            // Indexes for performance
            // Mais on s'en fout : on travaille rarement avec la base
            `CREATE INDEX IF NOT EXISTS idx_entrees_entree ON entrees(entree COLLATE NOCASE)`,
            `CREATE INDEX IF NOT EXISTS idx_oeuvres_sort ON oeuvres(titre_francais COLLATE NOCASE, titre_original COLLATE NOCASE)`,
            `CREATE INDEX IF NOT EXISTS idx_exemples_entry ON exemples(entry_id)`
        ];
        for (const query of queries) {
            await this.run(query);
        }
    }
    /**
     * Get database instance for use by specific DB classes
     */
    getDb() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }
    /**
     * Execute SQL query with parameters
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.run(sql, params, (err) => {
                if (err) {
                    reject(new Error(`SQL Error: ${err.message}\nQuery: ${sql}`));
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Execute SQL query and return single row
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(new Error(`SQL Error: ${err.message}\nQuery: ${sql}`));
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    /**
     * Execute SQL query and return all rows
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(new Error(`SQL Error: ${err.message}\nQuery: ${sql}`));
                }
                else {
                    resolve(rows || []);
                }
            });
        });
    }
    /**
     * Close database connection
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        this.db = null;
                        DatabaseService.instance = null;
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Handle database migrations
     */
    async handleMigrations() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        try {
            // Check if the old films table exists and needs renaming to oeuvres
            const hasFilmsTable = await new Promise((resolve, reject) => {
                this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='films'", (err, row) => {
                    if (err) {
                        resolve(false);
                        return;
                    }
                    resolve(!!row);
                });
            });
            if (hasFilmsTable) {
                console.log('[Migration] Migrating films table to oeuvres');
                // Rename films table to oeuvres
                await this.run('ALTER TABLE films RENAME TO oeuvres');
                console.log('[Migration] Films table renamed to oeuvres successfully');
            }
            // Check if the old schema exists (titre_id column)
            const hasOldSchema = await new Promise((resolve, reject) => {
                this.db.get("PRAGMA table_info(exemples)", (err, row) => {
                    if (err) {
                        // Table doesn't exist yet, no migration needed
                        resolve(false);
                        return;
                    }
                    // Check if table exists and has titre_id column
                    this.db.all("PRAGMA table_info(exemples)", (err2, rows) => {
                        if (err2) {
                            resolve(false);
                            return;
                        }
                        const hasTitreId = rows && rows.some((col) => col.name === 'titre_id');
                        resolve(!!hasTitreId);
                    });
                });
            });
            if (hasOldSchema) {
                console.log('[Migration] Migrating exemples table from titre_id to oeuvre_id');
                // Create new table with correct schema
                await this.run(`CREATE TABLE exemples_new (
                    oeuvre_id TEXT REFERENCES oeuvres(id) ON DELETE CASCADE,
                    indice INTEGER,
                    entry_id TEXT REFERENCES entrees(id),
                    content TEXT NOT NULL,
                    notes TEXT,
                    PRIMARY KEY (oeuvre_id, indice)
                )`);
                // Copy data from old table to new table, renaming column
                await this.run(`INSERT INTO exemples_new (oeuvre_id, indice, entry_id, content, notes)
                               SELECT titre_id, indice, entry_id, content, notes FROM exemples`);
                // Drop old table and rename new one
                await this.run('DROP TABLE exemples');
                await this.run('ALTER TABLE exemples_new RENAME TO exemples');
                console.log('[Migration] Migration completed successfully');
            }
        }
        catch (error) {
            console.log('[Migration] No migration needed or migration failed:', error);
            // Continue anyway - the CREATE TABLE IF NOT EXISTS will handle it
        }
    }
    /**
     * Clear all data (for testing)
     */
    async clearAllData() {
        await this.run('DELETE FROM exemples');
        await this.run('DELETE FROM oeuvres');
        await this.run('DELETE FROM entrees');
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map