/**
 * Classe abstraite pour les managers de cache, Extension/Webview
 * (ce module est donc chargé par les deux côté client/server)
 * 
 * Toutes les méthodes partagées sont définies ici.
 * TDb = types DB (DBEntryType, DBOeuvreType, DBExempleType)
 * TItem = types complets (EntryType, OeuvreType, ExempleType)
 */
export class UniversalCacheManager<TDb, TItem> {
  protected _cache: Map<string, TItem> = new Map();
  protected _built: boolean = false;
  protected _prepared: boolean = false;
  
  clear(): void { this._cache.clear(); this._built = false; this._prepared = false; }
  has(id: string): boolean { return this._cache.has(id); }
  get(id: string): TItem | undefined { return this._cache.get(id); }
  update(id: string, item: TItem): void { this._cache.set(id, item); }
  getAll(): TItem[] { return Array.from(this._cache.values()); }
  get size(): number { return this._cache.size; }
  forEach(fn: (item: TItem) => void): void { this._cache.forEach(item => fn(item)); }
  
  filter(filtre: (item: TItem) => boolean): TItem[] {
    const result: TItem[] = [];
    this.forEach(item => { if (filtre(item)) { result.push(item); }; });
    return result;
  }
  
  // Pour transformer TOUTES LES OCCURRENCES avec une fonction +fnTrans+
  async traverse(fnTrans: (item: TItem) => TItem) {
    this.forEach(item => this._cache.set((item as any).id, fnTrans(item)));
  }
  
  inject(
    data: TDb[],
    fnTrans: (item: TDb) => TItem
  ): void {
    this.clear();
    data.forEach((item: TDb) => {
      const fullItem = fnTrans(item);
      this._cache.set((fullItem as any).id, fullItem);
    });
    this._prepared = true;
    this._built = true;
  }

  // Retourne les données sérialisées (pour envoi par message)
  getDataSerialized(){
    return this.getAll().map(item => JSON.stringify(item));
  }
}
