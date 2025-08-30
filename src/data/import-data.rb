require_relative 'models/Entrees'
require_relative 'models/Oeuvres'
require_relative 'models/Exemples'
require_relative 'models/db'

class DataGetter 
  class << self
    def import_all
      DB.prepare
      Entry.import_all
      Exemple.import_all
      Oeuvre.import_all
    end
  end
end


DataGetter.import_all;