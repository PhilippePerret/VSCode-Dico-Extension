/**
 * Pour la gestion de l'accès à TMDB, les informations sur les
 * films.
 *
 */

import { RpcOeuvre } from "../models/Oeuvre";

export interface FilmType {
  tmdbId: string;
  titre_original: string;
  titre_francais?: string;
  annee: string;
}

export class TMDB {

  /**
   * @api
   * Récupère et retourne les informations du film de titre +titre+
   * 
   * @param titre Le titre du film dont il faut avoir les informations. Plus tard, on verra si on peut avoir plusieurs films d'un coup.
   * @returns 
   */
  public static async getInfoFilm(titre: string | string[]): Promise<FilmType> {

    const dataProv = await this.getMovieInfo(titre as string);
    console.log("Infos de film récupérées !", dataProv);

    const dataFilm = {
      tmdbId: null,
      titre_original: null,
      titre_francais: null,
      annee: null,
    };

    return dataFilm as unknown as FilmType;
  }

  // Usage combiné : rechercher puis récupérer les détails
  private static async getMovieInfo(title: string) {
    const searchResults = await this.searchMovie(title);
    if (searchResults.length > 0) {
      const movieId = searchResults[0].id;
      const movieDetails = await this.getMovieDetails(movieId);
      const movieCredits = await this.getMovieCredits(movieId);
      return Object.assign(movieDetails, movieCredits);
    }
    return null;
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
    console.log("this._TMDBSecrets", this._TMDBSecrets);
    if (undefined === this._TMDBSecrets) {
      await this.getTMDBSecrets();
    }
    console.log("J'ai pu récupérer les codes secrets");
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
    const director = data.crew.find(person => person.job === 'Director');
    const writers = data.crew.filter(person =>
      person.job === 'Writer' ||
      person.job === 'Screenplay' ||
      person.job === 'Story'
    );

    return {
      director: director?.name,
      writers: writers.map(w => w.name)
    };
  }
}