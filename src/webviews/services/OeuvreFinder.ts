/**
 * Pour la gestion de l'accès à TMDB, les informations sur les
 * films.
 *
 */

import { RpcOeuvre } from "../models/Oeuvre";
import { FlashMessageType } from "../PanelClient";
import { stopEvent } from "./DomUtils";
import { FormManager } from "./FormManager";

interface OeuvreType {
  id: string;
  tmdbId: string;
  imdbId?: string;
  titre: string;
  titre_original: string;
  titre_francais?: string;
  resume: string;
  annee: string;
  director?: string;
  auteurs?: string;
  langue: string | undefined;
  pays: string | undefined;
  editeur?: string | undefined,
  isbn?: string | undefined,
}

export interface OptionsOeuvre {
  type: string | 'film' | 'roman' | undefined;
  annee: number | undefined;
  langue: string | undefined;
  [x: string]: any;
}

/**
 * Classe qui permet vraiment de choisir l'œuvre finale, qu'elle 
 * vienne de TMDB (IMDB) ou de Wikipédia
 */
export class OeuvrePicker {
  // Le formulaire (transmis par la fenêtre principale)
  private static form: FormManager<any, any>;

  /**
   * @api
   * 
   * Entrée pour pouvoir trouver les informations d'un oeuvre.
   * 
   * Fonctionnement
   * --------------
   *  - On relève tous les titres possibles (sur TMDB (films) ou WikiPedia)
   *  - S'ils sont plus de 5, on les filtres par les options
   *  - S'ils sont toujours plus de 5, on demande de faire un premier choix,
   *    avec les données simples.
   *  - On relève les informations complètes des oeuvres restantes
   *  - On les affiche en boucle pour pouvoir en choisir une.
   * 
   * @param titre Le titre à trouver
   * @param options Options pour faciliter la recherche
   * @param form Formulaire dans lequle mettre les résultats
   */
  public static async findWithTitle(
    titre: string,
    options: OptionsOeuvre,
    form: FormManager<any, any>
  ) {
    this.form = form;
    // On cherche les candidats à partir du titre
    let oeuvres: OeuvreType[] = [];
    
    // Recherche d'un film
    if ( options.type === undefined || options.type === 'film' || options.type === 'série') {
      oeuvres = await TMDB.getSimpleInformations(titre, options);
    }

    if (oeuvres.length === 0) {
      // <= pas un film ou aucun film trouvé sur TMDB
      // => On cherche avec Wikipédia
      oeuvres = await new WikiPedia('fr').findOeuvreFromTitle(titre, options);
      console.log("Oeuvres remontées pas wikipédia:", oeuvres);
    }
    

    if (oeuvres.length === 0){
      this.flash('Aucune œuvre trouvée avec ce titre…', 'error');
      return undefined;
    }

    // Première tentative de filtrage par les options
    if ( oeuvres.length > 5 ) {
      const oeuvresFiltred = this.filterPerOptions(oeuvres, options);
      // On ne prend les oeuvres filtrées que s'il y en a
      if (oeuvresFiltred.length > 0) { oeuvres = oeuvresFiltred; }
    }

    if (oeuvres.length === 1){ this.peupleForm(oeuvres[0]); return; }
    
    // Si elles sont toujours trop nombreuses, on procède à un
    // premier choix avant d'aller chercher les informations
    // complète
    if (oeuvres.length > 5) {
      oeuvres = await this.chooseFiveMax(oeuvres);
      if (oeuvres.length === 1) { this.peupleForm(oeuvres[0]); return; }
    }

    // On peut récupérer les informations complètes des oeuvres
    // restantes (pour le moment seulement si ce sont des films)
    // Pour une œuvre récupérée sur Wikipédia, tout a déjà été
    // récupéré.
    if (options.type === undefined || options.type === 'film') {
      oeuvres = await TMDB.getFullInformations(oeuvres);
    } 
    
    // Et enfin, on peut choisir parmi les oeuvres restantes
    this.choose(oeuvres, 0);
    
  }
  /**
   * Reçoit une liste d'oeuvres et les affiche en boucle pour en 
   * choisir une.
   * 
   * @param oeuvres Les oeuvres parmi lesquelles choisir
   * @param ioeuvre Le "pointeur" de liste qui permet de savoir quelle oeuvre affichée
   */
  public static choose(oeuvres: OeuvreType[], ioeuvre: number) {
    if (ioeuvre >= oeuvres.length - 1) {
      this.flash('On reprend…', 'notice');
      ioeuvre = 0;
    }
    const dataOeuvre = oeuvres[ioeuvre];
    ++ ioeuvre;
    this.peupleForm(dataOeuvre);
    const map = new Map();
    map.set('o', ['Prendre cette œuvre', this.onChoose.bind(this)]);
    map.set('n', ['Suivante', this.choose.bind(this, oeuvres, ioeuvre)]);
    map.set('q', ['Finir', this.onCancel.bind(this)]);
    this.form.panel.flashAction("Est-ce cette œuvre-là ?", map);
  }

  /**
   * Permet de choisir, parmi un trop grand nombre d'œuvres, les cinq dont on va
   * relever toutes les informations pour pouvoir choisir la bonne.
   * 
   * @param oeuvres Les oeuvres initiales (20 maximum, avec TMDB)
   * @returns 
   */
  private static async chooseFiveMax(oeuvres: OeuvreType[]): Promise<OeuvreType[]>{
    const result = {
      oeuvres: oeuvres, // Les oeuvres, mais qu'on shiftera
      kept: [], // Les oeuvres qui seront gardées
      choosed: [], // C'est une liste par commodité, mais il n'y aura que l'oeuvre choisie (if any) 
      max: 5 // Le nombre maximum d'œuvres à conserver
    };
    return new Promise((resolve, reject) => {
      Object.assign(result, {resolve: resolve, reject: reject});
      this.chooseMaxIn(result);
    });
  }

  private static chooseMaxIn(result: {[x: string]: any}){
    const oeuvre = result.oeuvres.shift(); // la première car c'est la plus probable
    if (oeuvre && result.kept.length < result.max && result.choosed.length === 0) {
      // Tans qu'il reste des oeuvres à voir, on les présente
      this.peupleForm(oeuvre);
      const map = new Map();
      map.set('o', ['Mettre de côté', () => {result.kept.push(oeuvre); this.chooseMaxIn(result);}]);
      map.set('n', ['Rejeter', () => this.chooseMaxIn(result)]);
      map.set('y', ['C’est celle là !', () => {result.choosed = [oeuvre]; result.kept = []; this.chooseMaxIn(result);}]);
      map.set('q', ['Finir', () => {result.max = 0; this.chooseMaxIn(result);}]);
      this.form.panel.flashAction("Que dois-je faire de cette œuvre ?", map);
    } else {
      // On a passé en revue toutes les oeuvres, ou on en a choisie une en particulier,
      // ou on doit arrêter => on retourne celles qui ont été gardée.
      result.resolve(result.kept.push(...result.choosed));
    }
    
  }

  // Juste pour avoir un point de sortie
  public static onCancel(ev: Event){ev && stopEvent(ev);}

  public static onChoose(ev: Event){

    ev && stopEvent(ev);
  }

  private static flash(message: string, type: FlashMessageType){
    this.form.panel.flash(message, type);
  }

  // Affiche les données de l'œuvre dans le formulaire, pour pouvoir 
  // les garder.
  public static peupleForm(oeuvre: OeuvreType) {
    console.log("Peupler le formulaire avec : ", oeuvre);
    this.form.setValueOf('titre_affiche', oeuvre.titre);
    this.form.setValueOf('titre_original', oeuvre.titre_original);
    oeuvre.auteurs && this.form.setValueOf('auteurs', oeuvre.auteurs);
    this.form.setValueOf('resume', oeuvre.resume);
    oeuvre.annee && this.form.setValueOf('annee', oeuvre.annee);
    const infos = { 
      langue: oeuvre.langue || undefined, 
      pays: oeuvre.pays || undefined, 
      editeur: oeuvre.editeur || undefined,
      isbn: oeuvre.isbn || undefined,
      director: oeuvre.director || undefined,
    };
    let infosStr = JSON.stringify(infos);
    if (infosStr === '{}') { infosStr = ''; }
    this.form.setValueOf('notes', infosStr);
  }


  /**
   * @api
   * 
   * Méthode permettant de filtrer les oeuvres par années
   */
  public static filterPerOptions(oeuvres: OeuvreType[], options: OptionsOeuvre): OeuvreType[] {
    oeuvres = this.filterPerYear(oeuvres, options);
    oeuvres = this.filterPerCountry(oeuvres, options);
    oeuvres = this.filterPerLanguage(oeuvres, options);
    return oeuvres;
  }

  // Filtrage par année
  private static filterPerYear(oeuvres: OeuvreType[], options: OptionsOeuvre) {
    options.annee = Number(options.annee);
    // On peut en discriminer par leurs infos. Par exemple si une
    // année est fournie, on prend le film qui correspondrait à 
    // cette date ou les deux qui seraient les plus proches.
    var onlyOneMatches = false; // mis à true si un film correspond exactement à la date
    oeuvres = oeuvres.map((result: any) => {
      if (onlyOneMatches) { return result; /* on peut faire vite*/ }
      if (options.annee && result.annee === options.annee) {
        onlyOneMatches = true;
      }
      return result;
    }).filter((result: any) => {
      if (onlyOneMatches) {
        return result.annee === options.annee;
      } else {
        // On ne garde que les oeuvres dans une tranche de 10 ans
        return result.annee < (options.annee as number) + 5 && result.annee > (options.annee as number) - 5;
      }
    });
    return oeuvres;
  }
  private static filterPerCountry(oeuvres: OeuvreType[], options: OptionsOeuvre){
    if (undefined === options.pays) { return oeuvres; }
    return oeuvres.filter((oeuvre: OeuvreType) => oeuvre.pays === options.pays);
  }
  private static filterPerLanguage(oeuvres: OeuvreType[], options: OptionsOeuvre): OeuvreType[] {
    if (undefined === options.langue) { return oeuvres; }
    return oeuvres.filter((oeuvre: OeuvreType) => oeuvre.langue === options.langue);
  }

} // OeuvrePicker

/**
 * 
 * 
 * 
 * ==================== TMDB ======================
 * 
 * 
 * 
 */
export class TMDB {

  /**
   * @api
   * Récupère et retourne les informations des films de titre +titre+
   * 
   * @param titre Le titre du film dont il faut avoir les informations. Plus tard, on verra si on peut avoir plusieurs films d'un coup.
   * @returns 
   */
  public static async getSimpleInformations(
    titre: string,
    options: OptionsOeuvre 
  ): Promise<OeuvreType[]> {
    let searchResults = await this.searchMovie(titre);
    // On prépare les données (surtout dans le cas d'un filtrage
    // nécessaire)
    searchResults = searchResults.map((result: any) => {
      return {
        id: result.id,
        annee: Number(result.release_date.substring(0,4)),
        langue: result.original_language,
        titre_original: result.original_title,
        titre: result.title,
        resume: result.overview,
      };
    });
    console.log("Premiers résultats préparés (%i)", searchResults.length, structuredClone(searchResults));

    return searchResults;
 }

  /**
   * Retourne les informations complètes pour les films +oeuvres+
   * 
   */
  public static async getFullInformations(oeuvres: OeuvreType[]): Promise<OeuvreType[]> {
    return await Promise.all(oeuvres.map(async (oeuvre: OeuvreType) => this.getAllInfos(oeuvre)));
  }

  // @return Toutes les informations sur le film +dOeuvre+
  private static async getAllInfos(dOeuvre: OeuvreType): Promise<OeuvreType> {
    const movieId = dOeuvre.id;
    const details = await this.getMovieDetails(movieId);
    // console.log("details", details);
    const credits = await this.getMovieCredits(movieId);
    // console.log("credits", credits);
    return Object.assign(dOeuvre, {
      idmbId: details.imdb_id,
      pays: details.origin_country.join(', '),
      director: credits.director, 
      auteurs: credits.auteurs 
    });
  }


  private static _TMDBSecrets: { [x: string]: string };

  private static get TMDB_READING_API_TOKEN() {
    return this._TMDBSecrets.reading_api_token;
  }
  private static async getTMDBSecrets() {
    return RpcOeuvre.ask('tmdb-secrets')
      .then(retour => {
        // console.log("Retour des secrets : ", retour);
        this._TMDBSecrets = retour;
        return retour;
      })
      .catch(error => {
        console.error("Une erreur est survenue", error);
      });
  }

  // Recherche par titre
  private static async searchMovie(title: string) {
    // Si les codes n'ont pas encore été récupérés, il faut le faire
    if (undefined === this._TMDBSecrets) { await this.getTMDBSecrets(); }
    const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.TMDB_READING_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data.results; // tableau de films
  }

  // Informations détaillées d'un film par ID
  private static async getMovieDetails(movieId: string) {
    const url = `https://api.themoviedb.org/3/movie/${movieId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.TMDB_READING_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  }


  // Informations techniques (cast & crew)
  private static async getMovieCredits(movieId: string) {
    const url = `https://api.themoviedb.org/3/movie/${movieId}/credits`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.TMDB_READING_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();


    console.log("Information crédits complètes", data);

    // Filtrer les rôles qui t'intéressent
    type CreditsType = {directors: string[], writers: string[], director: string | undefined, auteurs: string | undefined}
    const credits: CreditsType = {
      directors: [],
      writers: [],
      director: undefined,
      auteurs: undefined
    };
    data.crew.forEach((person: {job: string, name: string, [x: string]: any}) => {
      switch(person.job){
        case 'Director':
          credits.directors.push(person.name + MARK_UNKNOWN_GENRE); break;
        case 'Writer':
        case 'Co-Writer':
        case 'Author':
        case 'Adaptation':
        case 'Screenplay':
        case 'Story':
        case 'Screenstory':
        case 'Book':
        case 'Novel':
          credits.writers.push(person.name+MARK_UNKNOWN_GENRE); break;
      }
    });

    const allauteurs = [];
    allauteurs.push(...credits.directors);
    allauteurs.push(...credits.writers);

    credits.director = credits.directors.join(', ');
    credits.auteurs = allauteurs.join(', '); 
    return credits;
  }
} // TMDB

const MARK_UNKNOWN_GENRE = '[HF?]';

/**
 * 
 * 
 * =============== WIKIPEDIA ==================
 * 
 *
 */
class WikiPedia {
  private baseUrl: string;
  private wikiApiUrl: string;

  constructor(lang: string = 'fr') {
    this.baseUrl = 'https://fr.wikipedia.org/api/rest_v1/page/summary/';
    this.wikiApiUrl = `https://${lang}.wikipedia.org/w/api.php`;
  }

  /**
   * @api
   * 
   * Trouve sur Wikipédia toutes les oeuvres correspondant au titre +titre+ et
   * en reetourne les informations dans un format standard (OeuvreType).
   * 
   * @param titre Le titre donné
   * @param options Les options pour filtrer (peut-être)
   * @returns La liste des oeuvres potentielles
   */
  async findOeuvreFromTitle(titre: string, options: OptionsOeuvre): Promise<OeuvreType[]> {
    try {
      // Étape 1: Rechercher la page
      let searchResults = await this.searchPage(titre);
      // console.log("Premiers résultats", searchResults);
      if (!searchResults || searchResults.length === 0) { return []; }

      // On exclut les titres qui ne contiennent pas le titre fourni
      searchResults = searchResults.filter((data: { [x: string]: any }) => {
        return data.title.match(titre);
      });
      // console.log("Pages filtrées (doivent contenir le titre)", searchResults);

      // On cherche particulièrement un titre contenant le type
      const resultsProv = searchResults.filter((data: { [x: string]: any }) => {
        return data.title.match(options.type);
      });
      if (resultsProv.length > 0) {
        searchResults = resultsProv;
        // console.log("Filtrage plus précis par le type", searchResults);
      }

      // Récupération des informations de base (bof…)
      searchResults = await this.getPageSummary(searchResults);
      // console.log("Après summary", searchResults);

      // Récupération du contenu détaillé des pages
      searchResults = await this.getPageContent(searchResults);
      // console.log("Après récupération du contenu des pages", searchResults);

      // Récupération des infobox si disponible
      searchResults = await this.getInfobox(searchResults);
      // console.log("Après récupération des infobox", searchResults);

      searchResults = this.structureInfosFromSources(searchResults);
      // console.log("Infos après restructuration", searchResults);

      // On ne retourne que les informations intéressantes
      return searchResults.map((result: { [x: string]: any }) => {
        return {
          titre: result.titre,
          titre_original: result.titre_original || result.titre,
          titre_francais: result.titre_francais,
          auteur: result.auteur,
          annee: result.annee,
          isbn: result.isbn,
          pays: result.pays,
          langue: result.langue,
          type: options.type,
          resume: result.resume
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des informations:', error);
      throw error;
    }
  }

  // Rechercher jusqu'à 10 pages Wikipedia par l'API correspondant au titre
  async searchPage(titre: string) {
    const searchUrl = `${this.wikiApiUrl}?action=query&format=json&list=search&srsearch=${encodeURIComponent(titre)}&srlimit=10&origin=*`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    return data.query?.search || [];
  }

    // Récupérer le résumé de la page
  async getPageSummary(searchResults: any[]) {
    return await Promise.all(
      searchResults.map(async (result: { [x: string]: any }) => {
        const summaryUrl = `${this.baseUrl}${encodeURIComponent(result.title)}`;
        const response = await fetch(summaryUrl);
        if (response.ok) { Object.assign(result, {summary: response.json()}); }
        return result;
      })
    );
  }

  // Récupérer le contenu complet de la page
  async getPageContent(searchResults: any[]) {
    return Promise.all(
      searchResults.map(async (result: { [x: string]: any }) => {
        const contentUrl = `${this.wikiApiUrl}?action=query&format=json&titles=${encodeURIComponent(result.title)}&prop=extracts&exintro=false&explaintext=true&origin=*`;
        const response = await fetch(contentUrl);
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        Object.assign(result, {pageContent: pages[pageId]?.extract || ''});
        return result;
      })
    );
  }

  // Récupérer l'infobox de la page
  async getInfobox(searchResults: any[]) {
    return Promise.all(
      searchResults.map(async (result: {[x: string]: any}) => {
        const infoboxUrl = `${this.wikiApiUrl}?action=query&format=json&titles=${encodeURIComponent(result.title)}&prop=revisions&rvprop=content&origin=*`;
        const response = await fetch(infoboxUrl);
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        const content = pages[pageId]?.revisions?.[0]?.['*'] || '';
        const infobox = this.parseInfobox(content);
        Object.assign(result, {
          infoBox: infobox,
          annee: infobox.annee,
          auteur: infobox.auteur,
          isbn: infobox.isbn,
          pays: infobox.pays,
        });
        return result;
      })
    );

 }

  // Parser l'infobox depuis le wikicode
  parseInfobox(wikicode: string) {
    const infobox: {[x: string]: any} = {};

    // console.log("Recherche d'infos dans le wikicode:", wikicode);

    // Rechercher les patterns d'infobox communes pour les livres
    const patterns = {
      titre: /\|\s*titre\s*=\s*(.+)/i,
      titre_original: /\|\s*titre[_\s]*orig(?:inal)?\s*=\s*(.+)/i,
      titre_francais: /\|\s*titre[_\s]*français?\s*=\s*(.+)/i,
      auteur: /\|\s*auteurs?\s*=\s*(.+)/i,
      annee: /\|\s*(?:année|date)[_\s]*(?:publication|parution)?\s*=\s*(.+)/i,
      pays: /\|\s*pays\s*=\s*(.+)/i,
      langue: /\|\s*langue[_\s]*originale?\s*=\s*(.+)/i,
      isbn: /\|\s*isbn\s*=\s*(.+)/i,
      editeur: /\|\s*éditeurs?\s*=\s*(.+)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = wikicode.match(pattern);
      if (match) {
        // Nettoyer la valeur extraite
        let value = match[1].trim();
        value = value.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1'); // Liens wiki
        value = value.replace(/{{[^}]+}}/g, ''); // Templates
        value = value.replace(/<[^>]+>/g, ''); // Balises HTML
        infobox[key] = value.trim();
      }
    }
    // Quelques rectifications
    if (infobox.annee) { infobox.annee = Number(infobox.annee.substring(0,4));}
    if (infobox.isbn) { infobox.isbn = infobox.isbn.split(' ')[0];}

    return infobox;
  }

  structureInfosFromSources(searchResults: any[]) {
    return searchResults.map((result: { [x: string]: any }) =>
      this.extractBookInfo(result.summary, result.pageContent, result.infoBox, result.title)
    );
  }

  // Extraire les informations du livre depuis toutes les sources
  extractBookInfo(summary: any, content: string, infobox: {[x: string]: any}, pageTitle: string) {

    const bookInfo: { [x: string]: any } = {
      titre: null,
      titre_original: null,
      titre_francais: null,
      auteurs: null,
      annee: null,
      pays: null,
      langue: null,
      isbn: null,
      editeur: null,
      resume: null
    };

    try {
      // Titre
      bookInfo.titre = infobox.titre || pageTitle;

      // Titre original
      bookInfo.titre_original = infobox.titre_original || this.extractFromText(content, /titre original[:\s]+([^\n.]+)/i);

      // Titre français
      bookInfo.titre_francais = infobox.titre_francais || this.extractFromText(content, /titre français[:\s]+([^\n.]+)/i);

      // Auteurs
      bookInfo.auteurs = infobox.auteur || this.extractFromText(content, /(?:écrit par|auteur[:\s]+|de\s+)([A-Z][^\n.]+)/);

      const getAnnee = () => {
        const anneeMatch = this.extractFromText(content, /(?:publié en|paru en|écrit en)\s+(\d{4})/i);
        if (anneeMatch) {
          return Number(anneeMatch.match(/\d{4}/)?.[0]);
        }
      };
      // Année
      bookInfo.annee = infobox.annee || getAnnee();

      // Pays
      bookInfo.pays = infobox.pays || this.extractFromText(content, /(?:pays d'origine|publié en|originaire de)\s+([A-Z][^\n.,]+)/i);

      // Langue originale
      bookInfo.langue = infobox.langue || this.extractFromText(content, /langue originale[:\s]+([^\n.,]+)/i);

      // ISBN
      const isbnMatch = infobox.isbn || this.extractFromText(content, /ISBN[:\s]+([\d-]+)/i);
      bookInfo.isbn = isbnMatch;

      // Éditeur
      bookInfo.editeur = infobox.editeur || this.extractFromText(content, /(?:éditions|éditeur)[:\s]+([^\n.,]+)/i);

      // Résumé (utiliser l'extrait de Wikipedia)
      bookInfo.resume = summary.extract || content.substring(0, 500) + '[…]';

      // Nettoyer les valeurs nulles ou vides
      Object.keys(bookInfo).forEach(key => {
        if (!bookInfo[key] || (typeof bookInfo[key] === 'string' && bookInfo[key].trim() === '')) {
          bookInfo[key] = null;
        }
      });

    } catch(erreur) {
      console.error("Erreur lors de l'extraction des données : ", erreur);
      bookInfo.error = (erreur as Error).message;
    }

    return bookInfo;
  }

    // Fonction utilitaire pour extraire du texte avec regex
    extractFromText(text: string, pattern: RegExp) {
        const match = text.match(pattern);
        return match ? match[1].trim() : null;
    }
}
