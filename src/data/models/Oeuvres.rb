require 'yaml'

class Oeuvre 
  class << self
    def import_all
      inject_data_in_db
      DB.check_data_count(name: 'oeuvres', count: @oeuvres_count)
    end
  
    def inject_data_in_db
      # inject_juste_pour_essai
      # return
      data = []
      YAML.safe_load(File.read(data_path)).each do |id, doeuvre|
        next if doeuvre['id']
        id = id.to_s
        annee = doeuvre['annee'] || doeuvre['year'] || begin
          if id.match?(/[12][0-9]{3}^/)
            id[-4..-1].to_i
          else nil end
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
          auteurs: doeuvre['auteurs'],
          notes: doeuvre['notes'],
          resume: doeuvre['resume']
        }
        unless data_oeuvre[:titre_original]
          throw "L'œuvre #{id} n'a pas de titre original défini (#{doeuvre})"
          exit 1
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