/**
 * Pour la gestion de l'accès à TMDB, les informations sur les
 * films.
 *
 */

import { RpcOeuvre } from "../models/Oeuvre";
import { stopEvent } from "./DomUtils";
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
        titre_original: result.original_title,
        titre: result.title,
        resume: result.overview,
      };
    });
    console.log("Premiers résultats préparés (%i)", searchResults.length, structuredClone(searchResults));

    if (searchResults.length > 5) {
      console.log("Résultat > 5 (premier filtre)");
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
      if (searchResults.length > 5) {
        // Si on n'a pas réussi à réduire le nombre d'œuvres candidates à moins de 6,
        // on demande à l'utilisateur de faire un choix réduit.
        return this.selectFiveOeuvresMax({results: searchResults, kept: [], choosed: null});
      }
    }

    console.log("Il y a moins de 5 résultats, je prends toutes les infos", searchResults);
    // On récupère toutes les informations
    const oeuvres = searchResults.map((dataOeuvre: {[x: string]: any}) => this.getAllInfos(dataOeuvre));
    if (oeuvres.length === 1) {
      this.peupleFormWithOeuvre(oeuvres[0]);
    } else {
      this.chooseFinalOeuvre({oeuvres: oeuvres, ioeuvre: 0});
    }
  }

  /**
   * Fonction permettant de choisir, parmi un (trop) grand nombre 
   * d'œuvres préselectionnées celles dont il faut réellement relever
   * les informations complètes pour choisir la bonne.
   * 
   * Malgré le titre, on peut choisir ici plus de 5 oeuvres. Mais ce
   * sera alors en tout connaissance de cause.
   * 
   */
  private static selectFiveOeuvresMax(params: { results: any[], kept: any[], choosed: any }) {
    console.log("Dans selectFive... il reste %i oeuvres", params.results.length);
    const oeuvreInfos = params.results.shift();
    if (oeuvreInfos) {
      this.peupleFormWithOeuvre(oeuvreInfos);
      const map = new Map();
      map.set('o', ['Mettre de côté', this.onKeepOeuvreInfo.bind(this, oeuvreInfos, params)]);
      map.set('n', ['Rejeter', this.selectFiveOeuvresMax.bind(this, params)]);
      map.set('y', ['C’est celle-ci !', this.onChooseOeuvreInfo.bind(this, oeuvreInfos, params)]);
      map.set('q', ['Finir', this.onEndPickupOeuvres.bind(this, params)]);
      this.form.panel.flashAction("Que dois-je faire de cette œuvre ?", map);
    } else {
      // Quand il n'y a plus d'œuvres
      this.chooseFinalOeuvre({oeuvres: params.kept, ioeuvre: 0});
    }
  }

  // Méthode appelée, lorsqu'on choisit les oeuvres à investiguer,
  // quand on veut arrêter le défilement (on a trouvé les candidates
  // possible).
  public static onEndPickupOeuvres(params: any) {
    if (params.kept.length /* <= si des œuvres ont été gardées */) {
      this.chooseFinalOeuvre({oeuvres: params.kept, ioeuvre: 0});
    }
  }

  // Pour conserver l'oeuvre courante
  public static onKeepOeuvreInfo(oeuvreInfos: {[x: string]: any}, params: any){
    console.log("-> onKeepOeuvre avec", oeuvreInfos);
    this.getAllInfos(oeuvreInfos);
    params.kept.push(oeuvreInfos);
    this.selectFiveOeuvresMax(params);
  }
  // Méthode appelée quand on choisit l'œuvre comme la bonne
  public static onChooseOeuvreInfo(oeuvreInfo: any, params: any){
    // Si les données complètes n'ont pas été ramassées avant, on les
    // ramasse maintenant
    if ( undefined === oeuvreInfo.auteurs) { this.getAllInfos(oeuvreInfo); }
    this.peupleFormWithOeuvre(oeuvreInfo);
    return true; // on en a fini
  }

  /**
   * Affiche les données de l'œuvre dans le formulaire du panneau Oeuvres
   * 
   * @param oeuvreData Données complètes de l'œuvre
   */
  private static peupleFormWithOeuvre(oeuvreData: {[x: string]: any}) {
    this.form.setValueOf('titre_original', oeuvreData.titre_original);
    this.form.setValueOf('titre_affiche', oeuvreData.titre);
    oeuvreData.auteurs && this.form.setValueOf('auteurs', oeuvreData.auteurs);
    this.form.setValueOf('resume', oeuvreData.resume);
    oeuvreData.annee && this.form.setValueOf('annee', oeuvreData.annee);
    const infos = {langue: oeuvreData.langue, pays: oeuvreData.pays};
    if (oeuvreData.director) { Object.assign(infos, {director: oeuvreData.director});}
    this.form.setValueOf('notes', JSON.stringify(infos));
  }
  
  // Fonction pour choisir l'œuvre finale parmi les œuvres trouvées,
  // quand il en reste plusieurs en lice.
  static chooseFinalOeuvre(params: { oeuvres: any[], ioeuvre: number }) {
    if (params.ioeuvre >= params.oeuvres.length - 1) {
      this.form.panel.flash('On reprend…', 'notice');
      params.ioeuvre = 0;
    }
    const dataOeuvre = params.oeuvres[params.ioeuvre];
    ++ params.ioeuvre;
    this.peupleFormWithOeuvre(dataOeuvre);
    const map = new Map();
    map.set('o', ['Prendre cette œuvre', this.onChooseFinalOeuvre.bind(this)]);
    map.set('n', ['Suivante', this.chooseFinalOeuvre.bind(this, params)]);
    map.set('q', ['Finir', this.onStop.bind(this)]);
    this.form.panel.flashAction("Est-ce cette œuvre-là ?", map);
  }

  // Pour s'arrêter sans rien faire
  public static onStop(ev: Event){
    ev && stopEvent(ev);
  }
  
  public static onChooseFinalOeuvre(){
    // En fait, il n'y a rien à faire puisqu'elle est déjà affichée dans le
    // formulaire
    this.form.panel.flash("Œuvre choisie, tu peux la compléter avant de l'enregistrer.", 'notice');
  }

  private static async getAllInfos(dOeuvre: {[x: string]: any}): Promise<{[x: string]: any}> {
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