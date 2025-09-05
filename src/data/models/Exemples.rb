require 'json'

class Exemple 
  class << self
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
      @table_orig_id_to_short_id = {}
      YAML.safe_load(File.read(data_path)).each do |id, dex|
        id = id.to_s
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
          # Contenu de l'exemple, qui peut être multiple (:exemples)
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