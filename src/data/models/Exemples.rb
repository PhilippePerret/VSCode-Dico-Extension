require 'json'

class Exemple 
  class << self
    
    # Fonction recevant un "identifiant" exemple de la forme "<oeuvre id>:<indice>"
    # et retournant l'exemple correctement formaté.
    # Cette méthode sert pour sortir le livre pour relecture et antidote
    def get_formated(id)
      oeuvre_id, indice = id.strip.split(':')
      request = 'SELECT content FROM exemples WHERE oeuvre_id = ? AND indice = ?'
      exemple = nil
      res = DB.db.execute(request, [oeuvre_id, indice]) do |row|
        exemple = row["content"]
      end
      if exemple.nil?
        raise "L'exemple #{id} n'existe pas."
      end
      oeuvre = Oeuvre.get_titre_of(oeuvre_id)
      if exemple.match?('TITRE')
        exemple.gsub(/TITRE/, oeuvre)
      elsif exemple.match?('NO_PREFIX')
        exemple.gsub(/NO_PREFIX/, '')
      else
        "dans #{oeuvre}, #{exemple}"
      end.strip
    end

    def export_all
      formats = [:json, :yaml, :text, :csv]
      DB.export_data('exemples', formats)
      puts "Données exemples exportées"
    end
    
    def import_all
      inject_data_in_db
      DB.check_data_count(name: 'exemples', count: @exemples_count)
    end

    def inject_data_in_db
      # Pour essai
      # inject_data_essai
      # return
      DB.inject_data(name: 'exemples', data: data_exemples)
    end

    # @Return les données lues dans le fichier YAML
    def data_exemples
      d = []
      # Table pour mettre les id d'oeuvres remplacés
      @table_orig_id_to_short_id = {}

      # Table pour mettre tous les identifiants d'œuvres erronés
      @bad_oeuvre_ids = []

      # Boucle sur toutes les données
      YAML.safe_load(File.read(data_path)).each do |id, dex|
        id = id.to_s

        # On vérifie d'abord l'existence de l'oeuvre
        unless Oeuvre.table_oeuvre_ids[dex['oeuvre']] 
          @bad_oeuvre_ids << dex['oeuvre']
        end
        @table_orig_id_to_short_id.store(dex['oeuvre'], id)

        i = 0
        while (dindice = dex[i += 1])
          if dindice['entree'] # pour compatibilité descendante
            # Recherche de l'entrée
            entry_id = Entry.get_id_from_entree(dindice['entree'])
            unless entry_id
              throw "Pas d'entry_id trouvé pour l'entrée : #{dindice['entree']}"
              exit 1
            end
          else
            entry_id = dindice['entry_id']
          end
          # Contenu textuel de l'exemple, qui peut être multiple (:exemples)
          exemple = (dindice['exemple']||dindice['exemples']).to_json
          data_exemple = {
            oeuvre_id: id,
            indice: i,
            entry_id: entry_id,
            content: exemple,
            notes: ''
          }
          d << data_exemple
        end
      end
     if @bad_oeuvre_ids.count > 0
      puts "MAUVAIS IDENTIFIANTS"
      puts "--------------------"
      puts @bad_oeuvre_ids.join("\n")
        throw ArgumentError.new("Identifiant d'oeuvres à corriger")
     end
      @exemples_count = d.count
      return d
    end


    # Retourne le "vrai" identifiant pour l'oeuvre d'identifiant
    # original +orig_id+
    # Cela tient à une mauvaise conception au départ qui fait que
    # j'avais des identifiants pour le fichier des oeuvres, en 
    # général assez longs (p.e. "Dancer_in_the_dark_2000") et que
    # utilisais des courts pour les exemples (p.e. DITD)
    #
    # Cette méthode est donc amenée à disparaitre puisqu'elle 
    # modifiera définitvement l'identifiant de l'œuvre pour lui 
    # attribuer le format court
    def real_id_from_oeuvre_id(orig_id)
      @table_orig_id_to_short_id[orig_id] || orig_id
    end


    # def inject_data_essai
    #   DB.inject_data(name: 'exemples', data: [
    #     {oeuvre_id: 'WHIP14', indice: 1, entry_id: 'structure', content: 'Salieri est compositeur (dimension Travail), vient d\'une famille où l\'art n\'existait pas (dimension Famille), a fait vœu de chasteté (dimension Amour), est très gourmand (dimension Passion).', notes: 'Portrait multidimensionnel'}
    #   ])
    # end

    def data_path
      @data_path ||= File.join(__dir__, '..', 'files', 'exemples.yaml')
    end
 

  end
end