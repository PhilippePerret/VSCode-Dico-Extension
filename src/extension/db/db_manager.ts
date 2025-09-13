import * as fs from 'fs';
import path from 'path';
import { DatabaseService } from "../services/db/DatabaseService";
import { IEntry } from '../models/Entry';
import { IOeuvre } from '../models/Oeuvre';
import { IExemple } from '../models/Exemple';
import { App } from '../services/App';

export class DBManager {
  private static instance: DBManager;
  private dbService: DatabaseService;
  
   private constructor(context: any, isTest: boolean = false) {
    this.dbService = DatabaseService.getInstance(context, isTest);
  }

  static getInstance(context: any, isTest: boolean = false): DBManager {
    if (!this.instance) {
      this.instance = new DBManager(context, isTest);
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    await this.dbService.initialize();
  }

  async createBackup(): Promise<string> {
    const context = App._context;
     const backupDir = path.join(context.globalStorageUri?.fsPath || context.extensionPath, 'backups');
    if (!fs.existsSync(backupDir)) { fs.mkdirSync(backupDir, { recursive: true }); }

    // Backup complet de la DB
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `dico-backup-${timestamp}.db`);
    fs.copyFileSync(this.dbService.dbPath, backupPath);
    console.log("Backup DB in %s", backupPath);
    return backupPath;
  }

  private async saveItemIn(table: string, item: any, params: any){
    params.errors = []; // pour mettre les éventuels erreurs
    try {
      await this.createBackup();
      const exists = await this.checkIfExists(item.id, table);      
      //TODO Prendre le nombre d'entrées et déterminer le nouveau nombre attendu
      await this.doSave(table, item, exists);
      // TODO Vérifier le nombre d'entrées
      params.ok = true;
    } catch(error){
      params.ok = false;
      params.errors.push(error);
    }
    return params;
  }


  private async doSave(table: string, data: any, exists: boolean): Promise<void> {
    let sql, params;
    if (exists) {
      // UPDATE générique
      const fields = Object.keys(data).filter(k => k !== 'id');
      sql = `UPDATE ${table} SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
      params = [...fields.map(f => data[f]), data.id];
    } else {
      // INSERT générique  
      const fields = Object.keys(data);
      sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
      params = fields.map(f => data[f]);
    }
    await this.dbService.run(sql, params);
  }

  async checkIfExists(id: string, table: string): Promise<boolean> {
    const exists = await this.dbService.get(`SELECT 1 FROM ${table} WHERE id = ?`, [id]);
    return !!exists;
  }

  async saveEntry(item: IEntry, params: any): Promise<any> {
    params = await this.saveItemIn('entrees', item, params);
    return params;
  }
 
  async saveOeuvre(item: IOeuvre, params: any): Promise<any> {
    params = await this.saveItemIn('oeuvres', item, params);
    return params;
  }

  async saveExemple(item: IExemple, params: any): Promise<any> {
    params = await this.saveItemIn('exemples', item, params);
    return params;
  }
}