import * as fs from 'fs';
import path from 'path';
import { DatabaseService } from "../services/db/DatabaseService";
import { App } from '../services/App';
import { AnyElementClass } from '../models/AnyElement';

class SaveError extends Error {
  public severity: number | undefined;
  
  constructor(message:string, severity: number | undefined = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.severity = severity;
  }
}

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

  // Pour faire un backup de la base (pour le moment, à chaque changement)
  async createBackup(): Promise<string> {
    const context = App._context;
     const backupDir = path.join(App.supportFolder, 'backups');
    if (!fs.existsSync(backupDir)) { fs.mkdirSync(backupDir, { recursive: true }); }

    // Backup complet de la DB
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `dico-backup-${timestamp}.db`);
    fs.copyFileSync(this.dbService.dbPath, backupPath);
    console.log("Backup DB in %s", backupPath);
    return backupPath;
  }

  /**
   * @api
   * Pour enregistrer vraiment la donnée.
   * 
   * @param table La table dans laquelle enregistrer
   * @param item Les données de l'item (entrée, exemple, oeuvre)
   * @param params Les paramètres de suivi
   */
  async saveItemIn(table: string, item: any, params: any, classItem: AnyElementClass){
    params.errors = []; // pour mettre les éventuels erreurs
    params.ok = true ; // soyons optimistes
    try {
      await this.createBackup();
      const exists = await this.checkIfExists(item, table);      
      Object.assign(params, {isNewItem: !exists}); // pour indiquer que c'est une création
      // Prendre le nombre d'entrées et déterminer le nouveau nombre attendu
      const countBefore = await this.getRowCountIn(table);
      await this.doSave(table, item, exists);
      // Vérifier le nombre d'entrées
      const countAfter = await this.getRowCountIn(table);
      const diffCount = exists ? 0 : 1 ;
      if ( countAfter !== (countBefore + diffCount)) {
        throw new SaveError(
          `Après enregistrement de l'item ${item.id}, le nombre de données dans ${table} ne correspond pas au résultat attendu.`,
          3
        );
      }
      // Que ce soit un nouvel élément ou pas, il faut le compléter de toutes
      // les propriétés utiles à l'affichage et la gestion rapide
      // côté client
      params.item = classItem.completeItemForClientAfterSave(params.item);
      console.log("params en fin de saveItemin", params.item);
    } catch(error: any){
      params.ok = false;
      params.errors.push(error.message);
    }
    return params;
  }

  // Procède véritablement à l'enregistrement
  private async doSave(table: string, data: any, exists: boolean): Promise<void> {
    let sql, params;
    if (exists) {
      // UPDATE générique
      let whereClause: string;
      let dataClause: string[];
      switch(table){
        case 'exemples':
          whereClause = 'oeuvre_id = ? AND indice = ?';
          dataClause = [data.oeuvre_id, data.indice];
          break;
        default:
          whereClause = 'id = ?';
          dataClause = [data.id];
      }
      const fields = Object.keys(data).filter(k => k !== 'id');
      sql = `UPDATE ${table} SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE ${whereClause}`;
      params = [...fields.map(f => data[f]), ...dataClause];
    } else {
      // INSERT générique  
      const fields = Object.keys(data);
      sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
      params = fields.map(f => data[f]);
    }
    await this.dbService.run(sql, params);
  }

  async checkIfExists(item: Record<string, any>, table: string): Promise<boolean> {
    let whereClause: string;
    let dataClause: string[];
    switch(table){
      case 'exemples':
        whereClause = 'oeuvre_id = ? AND indice = ?';
        dataClause  = [item.oeuvre_id, item.indice]; 
        break;
      default:
        whereClause = 'id = ?';
        dataClause = [item.id];
    }
    const exists = await this.dbService.get(`SELECT 1 FROM ${table} WHERE ${whereClause}`, dataClause);
    return !!exists;
  }
  
  async getRowCountIn(table: string): Promise<number> {
    const result = await this.dbService.get(`SELECT COUNT(*) as count FROM ${table}`);
    return result.count;
  }
}