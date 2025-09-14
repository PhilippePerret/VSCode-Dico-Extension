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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBManager = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const DatabaseService_1 = require("../services/db/DatabaseService");
const App_1 = require("../services/App");
class DBManager {
    static instance;
    dbService;
    constructor(context, isTest = false) {
        this.dbService = DatabaseService_1.DatabaseService.getInstance(context, isTest);
    }
    static getInstance(context, isTest = false) {
        if (!this.instance) {
            this.instance = new DBManager(context, isTest);
        }
        return this.instance;
    }
    async initialize() {
        await this.dbService.initialize();
    }
    async createBackup() {
        const context = App_1.App._context;
        const backupDir = path_1.default.join(context.globalStorageUri?.fsPath || context.extensionPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        // Backup complet de la DB
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path_1.default.join(backupDir, `dico-backup-${timestamp}.db`);
        fs.copyFileSync(this.dbService.dbPath, backupPath);
        console.log("Backup DB in %s", backupPath);
        return backupPath;
    }
    async saveItemIn(table, item, params) {
        params.errors = []; // pour mettre les éventuels erreurs
        params.ok = true; // soyons optimistes
        try {
            await this.createBackup();
            const exists = await this.checkIfExists(item.id, table);
            // Prendre le nombre d'entrées et déterminer le nouveau nombre attendu
            const countBefore = await this.getRowCountIn(table);
            await this.doSave(table, item, exists);
            // Vérifier le nombre d'entrées
            const countAfter = await this.getRowCountIn(table);
            const diffCount = exists ? 0 : 1;
            if (countAfter === (countBefore + diffCount)) {
                params.ok = true;
            }
            else {
                throw new Error(`Après enregistrement de l'item ${item.id}, le nombre de données dans ${table} ne correspond pas au résultat attendu.`, severity, 3);
            }
        }
        catch (error) {
            params.ok = false;
            params.errors.push(error);
        }
    }
    async doSave(table, data, exists) {
        let sql, params;
        if (exists) {
            // UPDATE générique
            const fields = Object.keys(data).filter(k => k !== 'id');
            sql = `UPDATE ${table} SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
            params = [...fields.map(f => data[f]), data.id];
        }
        else {
            // INSERT générique  
            const fields = Object.keys(data);
            sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
            params = fields.map(f => data[f]);
        }
        await this.dbService.run(sql, params);
    }
    async checkIfExists(id, table) {
        const exists = await this.dbService.get(`SELECT 1 FROM ${table} WHERE id = ?`, [id]);
        return !!exists;
    }
    async getRowCountIn(table) {
        const result = await this.dbService.get(`SELECT COUNT(*) as count FROM ${table}`);
        return result.count;
    }
}
exports.DBManager = DBManager;
//# sourceMappingURL=db_manager.js.map