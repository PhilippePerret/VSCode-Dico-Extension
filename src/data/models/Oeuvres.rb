require 'yaml'

class Oeuvre 
  class << self

    def get_titre_of(oeuvre_id) 
      table_id_to_titre[oeuvre_id] || oeuvre_id
    end
    def table_id_to_titre
      @table_id_to_titre || begin
        tbl = {}
        db = DB.db
        db.results_as_hash = true
        db.execute('SELECT id, titre_affiche as titre FROM oeuvres') do |row|
          tbl.store(row['id'], row['titre'])
        end
        tbl
      end
    end

    def export_all
      formats = [:json, :yaml, :text, :csv]
      DB.export_data('oeuvres', formats)
      puts "Oeuvre exportées avec succès aux formats #{formats.join(', ')}"
    end

    def import_all
      inject_data_in_db
      DB.check_data_count(name: 'oeuvres', count: @oeuvres_count)
    end

    # Retourne une table avec en clé les identifiant des oeuvres
    # et en données la donnée de l'oeuvre.
    # Cette table est fait pour pouvoir vérifier l'existence de
    # l'oeuvre_id dans les exemples.
    def table_oeuvre_ids
      @table_oeuvre_id ||= get_oeuvre_ids
    end
    def get_oeuvre_ids
      table = {}
      YAML.safe_load(File.read(data_path)).each do |id, doeuvre|
        next if doeuvre['id']
        table.store(id.to_s, doeuvre);
      end
      table
    end

    def inject_data_in_db
      # inject_juste_pour_essai
      # return
      data = []
      table_oeuvre_ids.each do |id, doeuvre|

        # On essaie d'extraire l'année de l'id si elle n'est pas explicitement définie
        annee = doeuvre['annee'] || doeuvre['year'] || begin
          if id.match?(/_?[12][0-9]{3}$/)
            id[-4..-1].to_i
          else nil end
        end
        if id.match?(/[0-9]/) && annee.nil?
          puts "L'année n'a pas pu être déduite de '#{id}'"
          raise "Pour s'arrêter tout de suite"
          exit 1
        elsif annee.nil?
          puts "Année introuvable dans : #{id}"
        end
        # l'ID doit changer s'il est utilisé par les exemples
        final_id = Exemple.real_id_from_oeuvre_id(id)
        if final_id != id 
          puts "Changement d'id d'oeuvre : #{id} => #{final_id}"
        end
        data_oeuvre =  {
          id: final_id,
          titre_affiche: doeuvre['title_in_text'] || doeuvre['title'],
          titre_original: doeuvre['title'],
          titre_francais: doeuvre['title_fr'],
          type: doeuvre['type'],
          annee: annee,
          auteurs: doeuvre['authors'].join(', '),
          notes: doeuvre['notes'],
          resume: doeuvre['resume']
        }
        unless data_oeuvre[:titre_original]
          throw "L'œuvre #{id} n'a pas de titre original défini (#{doeuvre})"
        end
        data << data_oeuvre
      end
      # Pour débug
      # puts "=== OEUVRES ==="
      # puts data
      @oeuvres_count = data.count
      DB.inject_data(name: 'oeuvres', data: data)
      puts "Oeuvres injectées dans la base de données"
    end

    def inject_juste_pour_essai
      DB.inject_data(name: 'oeuvres', data: [
        {id: 'WHIP14', titre_affiche: 'Whiplash', titre_original: 'Whiplash', titre_francais: nil, annee: 2014, auteurs: 'Damien CHAZELLE (H, réalisateur, scénariste)', notes: 'Personnages: Andrew (Miles TELLER), Fletcher (J.K. SIMMONS)', resume: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student\'s potential.'}
      ])
    end

    def data_path
      @data_path ||= File.join(__dir__, '..', 'files', 'oeuvres.yaml')
    end
  end
end