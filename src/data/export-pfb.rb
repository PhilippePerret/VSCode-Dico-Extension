require_relative 'models/Entrees'
require_relative 'modules/PFB'
require_relative 'models/Oeuvres'
require_relative 'models/Exemples'
require_relative 'models/db'

class DataGetter 
  class << self

    # Méthode générale qui exporte tout le dictionnaire pour Antitode, 
    # c'est-à-dire en supprimant tout ce qui relève des balises et des
    # code à ne pas interpréter
    # Il faut également mettre des repères pour savoir où trouver les
    # élément, par exemple pour les exemples et les références d'œuvre.
    def export_pfb
      Entry.export_for_pfb
      Oeuvre.export_for_pfb
      `open -a Finder "#{APP_FOLDER}/export"`
    end
  end
end


DataGetter.export_pfb;