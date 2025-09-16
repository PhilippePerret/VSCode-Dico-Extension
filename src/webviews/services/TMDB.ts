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
  langue: string;
  pays: string;
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
    let oeuvres: OeuvreType[];
    if ( options.type === undefined || options.type === 'film') {
      oeuvres = await TMDB.getSimpleInformations(titre, options);
    } else {
      oeuvres = await WikiPedia.findOeuvreFromTitle(titre, options);
    }

    if (oeuvres.length === 0){
      this.flash('Aucune œuvre trouvée avec ce titre…', 'error');
      return undefined;
    }

    // Première tentative de filtrage par les options
    if ( oeuvres.length > 5 ) {
      oeuvres = this.filterPerOptions(oeuvres, options);
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
    if (options.type === undefined || options.type === 'film') {
      oeuvres = await TMDB.getFullInformations(oeuvres);
    } else {
      // Pour le moment, on ne fait rien pour un oeuvre récupérée
      // sur wikipédia
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
    this.form.setValueOf('titre_affiche', oeuvre.titre);
    this.form.setValueOf('titre_original', oeuvre.titre_original);
    oeuvre.auteurs && this.form.setValueOf('auteurs', oeuvre.auteurs);
    this.form.setValueOf('resume', oeuvre.resume);
    oeuvre.annee && this.form.setValueOf('annee', oeuvre.annee);
    const infos = { langue: oeuvre.langue, pays: oeuvre.pays };
    if (oeuvre.director) { Object.assign(infos, { director: oeuvre.director }); }
    this.form.setValueOf('notes', JSON.stringify(infos));
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

class WikiPedia {

  /**
   * @api
   * Recherche les oeuvres de même nom sur Wikipédia et les envoie
   * pour l'affichage et le choix.
   */
  public static async findOeuvreFromTitle(titre: string, options: OptionsOeuvre): Promise<OeuvreType[]> {

    return [];  // pour le moment
  }
}

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
    console.log("details", details);
    const credits = await this.getMovieCredits(movieId);
    console.log("credits", credits);
    let auteurs = credits.writers;
    auteurs.unshift(credits.director);
    auteurs = auteurs.map((a: string) => `${a}[HF?]`).join(', ');
    return Object.assign(dOeuvre, {
      idmbId: details.imdb_id,
      pays: details.origin_country.join(', '),
      director: `${credits.director}[HF?]`,
      auteurs: auteurs
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

    // Filtrer les rôles qui t'intéressent
    const director = data.crew.find((person: {[x: string]: any}) => person.job === 'Director');
    const writers = data.crew.filter((person: {[x: string]: any}) => {
      person.job === 'Writer' || person.job === 'Screenplay' || person.job === 'Story';
    });

    return {
      director: director?.name,
      writers: writers.map((w: {[x: string]: any}) => w.name)
    };
  }
} // TMDB