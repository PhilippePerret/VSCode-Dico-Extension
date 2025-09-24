export class Constants {
  static readonly ENTRIES_GENRES: Record<string, string> = {
    'nm': 'n.m.',
    'nmp': 'n.m.pl.',
    'nf': 'n.f.',
    'np': 'n.pl.',
    'vb': 'verbe',
    'adj': 'adj.',
    'adv': 'adv.',
    'la': 'loc.adv.'
  }; 
  static genreNotExists(genre: string): boolean {
    return !this.ENTRIES_GENRES[genre];
  }
  static getGenre(genreId: string): string {
    return this.ENTRIES_GENRES[genreId] || 'inconnu';
  }

  /**
   * Les préfixes/marques qui introduisent des index dans les définitions
   * principalement. Permet, par exemple dans le check des valeurs des
   * définitions, de vérifier l'existence des mots référencés.
   * 
   * Leur forme canonique est :
   * 
   *  <mark>(<id entrée>) ou <mark>(<texte écrit>|<id entrée>)
   */
  static readonly MARK_ENTRIES = {
    '->': {name: "Envoi simple"},
    'index': {name: 'Simple indexation'},
    'tt': {name: 'simple terme technique (sans page)'}
  };
}