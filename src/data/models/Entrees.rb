class Entry 
  class << self
    def import_all
      inject_data_in_db
      DB.check_data_count(name: 'entrees', count: @table_entree_to_id.keys.count)
    end

    def export_all
      formats = [:json, :yaml, :text, :csv]
      DB.export_data('entrees', formats)
      puts "Données entrées exportées"
    end

    # Reçoit l'entrée (humaine, textuelle) et retourne l'id correspondant
    def get_id_from_entree(entree)
      @table_entree_to_id[entree.downcase]
    end

    def inject_data_in_db
      DB.inject_data(name: 'entrees', data: collected_data)
    end
    
    # Collecte les données dans le fichier complet
    #
    # @return Array<Hash> des données prêtes à être injectées dans la base
    def collected_data
      @table_entree_to_id = {}
      File.read(data_path).strip.split("\n\n").map do |block_entry|
        lines = block_entry.split("\n")
        entree, reste = lines.shift.split('@').map { |s| s.strip }
        id, genre = reste.split('/').map { |s| s.strip }
        cat = if lines[0].start_with?('@')
          lines.shift.split(' ').map{|s| s.strip[1..-1]}.join(', ')
        else
          nil
        end
        # Mémoriser la correspondance entre l'entrée et l'id, pour
        # les exemples dans l'ancienne formule
        @table_entree_to_id.store(entree.downcase, id)
        # Le reste, c'est la définition
        definition = lines.join("\n")
        {
          id: id,
          entree: entree,
          genre: genre,
          categorie_id: cat,
          definition: definition
        }
      end
    end

    def injection_juste_pour_essai
      DB.inject_data(name: 'entrees', data: [
        {id: 'structure', entree: 'Structure', genre: 'nf', categorie_id: '', definition: 'Organisation générale d\'un récit, manière dont sont agencés les différents éléments narratifs.'}
      ])
    end


    def data_path
      @data_path ||= File.join(__dir__, '..','files','entrees.txt')
    end
  end
end