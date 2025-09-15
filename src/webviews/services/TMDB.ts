/**
 * Pour la gestion de l'accès à TMDB, les informations sur les
 * films.
 *
 */

import { resourceLimits } from "worker_threads";
import { RpcOeuvre } from "../models/Oeuvre";
import { FormManager } from "./FormManager";

export interface FilmType {
  tmdbId: string;
  titre_original: string;
  titre_francais?: string;
  annee: string;
}

export class TMDB {

  private static form: FormManager<any, any>;

  /**
   * @api
   * Récupère et retourne les informations des films de titre +titre+
   * 
   * @param titre Le titre du film dont il faut avoir les informations. Plus tard, on verra si on peut avoir plusieurs films d'un coup.
   * @returns 
   */
  public static async getInfoFilm(
    titre: string,
    options: { annee: number | undefined, langue: string | undefined, [x: string]: any } | undefined = undefined,
    form: FormManager<any, any>
  ): Promise<void> {
    this.form = form;
    let searchResults = await this.searchMovie(titre);
    // On prépare les données (surtout dans le cas d'un filtrage
    // nécessaire)
    searchResults = searchResults.map((result: any) => {
      return {
        id: result.id,
        annee: Number(result.release_date.substring(0,4)),
        langue: result.original_language,
        title_original: result.original_title,
        resume: result.overview,
      };
    });

    if (searchResults.length > 5) {
      if (options) {
        if (undefined !== options.annee) { 
          options.annee = Number(options.annee); 
          // On peut en discriminer par leurs infos. Par exemple si une
          // année est fournie, on prend le film qui correspondrait à 
          // cette date ou les deux qui seraient les plus proches.
          var oneMovieMatchsYear = false; // mis à true si un film correspond exactement à la date
          searchResults = searchResults.map((result: any) => {
            if (oneMovieMatchsYear) { return result; /* on peut faire vite*/ }
            if (options.annee && result.annee === options.annee) {
              oneMovieMatchsYear = true;
            }
            return result;
          }).filter((result: any) => {
            if (oneMovieMatchsYear) {
              return result.annee === options.annee;
            } else {
              // On ne garde que les films dans une tranche de 10 ans
              return result.annee < (options.annee as number) + 5 && result.annee > (options.annee as number) - 5;
            }
          });
        }// si une année est fournie
        if (options.langue) {
          // Discrimination par la langue
          searchResults = searchResults.filter( (result: any) => result.langue === options.langue );
        }
      }
      if (searchResults > 5) {
        return this.selectFiveOeuvresMax({results: searchResults, kept: [], choosed: null});
      }
    }
    searchResults = this.getAllInfos(searchResults);
    if (searchResults.length === 1) {
      this.peupleFormWithOeuvre(searchResults[0]);
    } else {
      this.chooseFinalOeuvre(searchResults);
    }
  }

  /**
   * Fonction permettant de choisir, parmi un (trop) grand nombre 
   * d'œuvres préselectionnées celles dont il faut réellement relever
   * les informations complètes pour choisir la bonne.
   */
  private static selectFiveOeuvresMax(params:{results: any[], kept: any[], choosed: any}) {
    const oeuvreInfos = params.results.shift();
    this.peupleFormWithOeuvre(oeuvreInfos);
    const map = new Map();
    map.set('o', this.onKeepOeuvreInfo.bind(this, oeuvreInfos, params));
    map.set('n', this.selectFiveOeuvresMax.bind(this, params));
    map.set('y', this.onChooseOeuvreInfo.bind(this, oeuvreInfos, params));
  }
  static onKeepOeuvreInfo(oeuvreInfos: {[x: string]: any}, params: any){
    params.kept.push(oeuvreInfos);
    this.selectFiveOeuvresMax(params);
  }
  // Méthode appelée quand on choisit l'œuvre comme la bonne
  static onChooseOeuvreInfo(oeuvreInfo: any, params: any){
    const oeuvreData = this.getAllInfos(oeuvreInfo);
    this.peupleFormWithOeuvre(oeuvreData);
    return true;
  }

  /**
   * Affiche les données de l'œuvre dans le formulaire du panneau Oeuvres
   * 
   * @param oeuvreData Données complètes de l'œuvre
   */
  private static peupleFormWithOeuvre(oeuvreData: {[x: string]: any}) {
    this.form.setValueOf('titre_original', oeuvreData.titre_original);
    this.form.setValueOf('titre_affiche', oeuvreData.titre);
    this.form.setValueOf('auteurs', oeuvreData.auteurs);
    this.form.setValueOf('resume', oeuvreData.resume);
    const infos = {langue: oeuvreData.langue, pays: oeuvreData.pays};
    this.form.setValueOf('notes', JSON.stringify(infos));
  }
  
  // Fonction pour choisir l'œuvre finale parmi les œuvres trouvées,
  // forcément plusieur
  static chooseFinalOeuvre(searchResults: any[]){
    const dataOeuvre = searchResults.pop();
    if ( dataOeuvre) {
      // il en reste une
    } else {
      // Il ne reste plus d'œuvre
      this.form.panel.flash('Il n’y a pas d’autres œuvres, désolé…', 'error');
    }
  }
  static getAllInfos(searchResults: any[]){
    return searchResults.map( async (result: any) => {
      const movieId = result.id;
      const details = await this.getMovieDetails(movieId);
      const credits = await this.getMovieDetails(movieId);
      return Object.assign(result, {
        idmbId: details.imdb_id,
        pays: details.original_country.join(', '),
        director: credits.director,
        auteurs: [credits.director].push(...credits.writers.map((a: string) => `${a}[?]`))
      });
    }).filter( (dFilm: any) => dFilm !== null );
 }


  private static _TMDBSecrets: { [x: string]: string };

  private static get TMDB_READING_API_TOKEN() {
    return this._TMDBSecrets.reading_api_token;
  }
  private static get TMDB_API_KEY() {
    return this._TMDBSecrets.api_key;
  }

  private static async getTMDBSecrets() {
    return RpcOeuvre.ask('tmdb-secrets')
      .then(retour => {
        console.log("Retour des secrets : ", retour);
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
    console.log("Première data", data);
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
}