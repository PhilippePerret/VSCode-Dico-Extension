/**
 * Utilitaire pour normaliser les chaînes de caractères
 * (suppression des accents, minuscules, etc.)
 */
export class StringNormalizer {
  /**
   * Normalise une chaîne en minuscules
   */
  static toLower(text: string): string {
    return text.toLowerCase();
  }

  /**
   * Normalise une chaîne en supprimant les accents et diacritiques
   * TODO: À améliorer avec une vraie fonction de normalisation
   */
  static rationalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD') // Décompose les caractères accentués
      .replace(/[\u0300-\u036f]/g, '') // Supprime les marques diacritiques
      .replace(/[^a-zA-Z0-9]/g, '');  // note : si c'était avant la ligne précédente, il n'y aurait pas besoin de la ligne précédente…
  }
}
