require 'fileutils'

APP_FOLDER = File.absolute_path(File.join(__dir__, '..', '..', '..'))
# puts "APP_FOLDER = #{APP_FOLDER}"
class DataGetter
  class << self
  
    def file_path
      @file_path ||= File.join(export_folder, fname)
    end
    def fname
      @fname ||= begin 
        now = Time.now
        "dictionnaire-v#{now.strftime('%Y-%m-%d')}"
      end
    end
    def export_folder
      @export_folder ||= File.join(APP_FOLDER,'export').tap{|p| FileUtils.mkdir_p(p)}
    end
  end #/<< self
end

class Entry
  class << self
    def export_for_pfb
      begin
        table_genres = table_genres_from_js
        @ref = File.open(DataGetter.file_path, 'w')

        db = DB.db
        db.results_as_hash = true
        db.execute("SELECT * FROM `entrees` ORDER BY `entree`")
        .sort_by do |row| 
          row['entree'].unicode_normalize(:nfd).downcase 
        end
        .each do |row|
          puts "#{row["entree"]} (#{row["id"]})"
          @table_exemple_key_to_lettre = {}
          def formate_definition(definition)
            definition
            .gsub(/EXEMPLES\[(.+?)\]/){ traite_exemples($1) }
            .gsub(/EX\[(.+?)\]/){ traite_renvoi_exemple($1) }
            .gsub(/\[#.+?#\]/, '') # quelquefois les todo
            # .gsub(/oeuvre\((.+?)\)/){ traite_oeuvre_id($1) }
            # .gsub(/"(.+?)"/, '« \1 »')
          end
          def traite_renvoi_exemple(ex_ids)
            'ex.' + ex_ids
            .split(',')
            .map do |exid|
              exid = exid.strip
              get_lettre_for_exemple(exid)
            end
            .pretty_join
          end
          def get_lettre_for_exemple(ex_id)
            lettre = @table_exemple_key_to_lettre[ex_id]
            if lettre.nil?
              puts "Impossible de trouver la lettre de l'exemple #{ex_id} (ce qui signifierait que cet exemple n'est pas inscrit ou n'existe pas)." 
              puts "La table contient : #{@table_exemple_key_to_lettre.inspect}"
              raise "Impossible de continuer"
            end
            "(#{lettre})"
          end
          def traite_exemples(idlist)
            lettres = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av', 'aw', 'ax', 'ay', 'z', 'ba']
            exemples = idlist
              .split(',')
              .map do |i| 
                i = i.strip
                lettre = lettres.shift
                raise "Il manque des lettres d'exemples" if lettre.nil?
                @table_exemple_key_to_lettre.store(i, lettre);
                "(#{lettre}) " + Exemple.get_formated(i)
              end
              .join(', ')
            exemples += '.' unless exemples.end_with?('.')
            'Exemples : ' + exemples 
          end
          def traite_oeuvre_id(oeuvre_id)
            return oeuvre_id if oeuvre_id.match?(' ')
            Oeuvre.get_titre_of(oeuvre_id)
          end
          # - Composition de la sortie
          @ref.puts "#{row["entree"]} @#{row["id"]}/#{row["genre"]}"
          @ref.puts "#{formate_definition(row["definition"])}"
          @ref.puts ""
          # 
          # === / FIN MISE EN FORME ===
          #
        end
      rescue Exception => e
        puts "ERREUR : #{e.message}"
        puts e.backtrace.join("\n")
      ensure
        @ref && @ref.close
      end

      puts "\nLe fichier final se trouve dans export/antidote"
    end
  
    # On récupère les genres du fichier JS des constantes
    def table_genres_from_js
      pth = File.join(APP_FOLDER, 'src','bothside','UConstants')
      cmd = 'bun -e "import { Constants } from \''+pth+'\'; console.log(JSON.stringify(Constants.ENTRIES_GENRES));"'
      JSON.parse(`#{cmd}`)
    end

  end #/ << self
end #/Entry


class Oeuvre
  class << self
    
    def export_for_pfb
      puts "Je dois apprendre à sortir les oeuvres pour pfb"
    end

  end #/<< self class Oeuvre
end #/Oeuvre

class Array
  def pretty_join
    list = self.dup
    last = list.pop
    list.join(', ') + ' et ' + last
  end
end