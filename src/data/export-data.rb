require_relative 'models/Entrees'
require_relative 'models/Oeuvres'
require_relative 'models/Exemples'
require_relative 'models/db'

class DataGetter 
  class << self
    def export_all
      Entry.export_all
      Exemple.export_all
      Oeuvre.export_all
    end
  end
end


DataGetter.export_all;