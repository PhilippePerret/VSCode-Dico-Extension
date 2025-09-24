require 'sqlite3'
require 'json'
require 'yaml'
require 'csv'
require_relative 'hash_extension'

TEXT = 'text'
INT = 'int'

class DB
  class << self

    # Pour exporter les données 
    #
    # @param :name Nom de la table des données
    # @param :formats Liste des formats. Peut contenir [:json, :yaml, :text]
    def export_data(name, formats)
      asJson = formats.include?(:json)
      asYaml = formats.include?(:yaml)
      asText = formats.include?(:text)
      asCsv  = formats.include?(:csv)
      begin
        @json_file = asJson ? File.open(json_path(name), 'w') : nil
        @yaml_file = asYaml ? File.open(yaml_path(name), 'w') : nil
        @text_file = asText ? File.open(text_path(name), 'w') : nil
        @csv_file = asCsv ? File.open(csv_path(name), 'w') : nil

        @json_file.puts '[' if asJson
        @yaml_file.puts '---' if asYaml

        first_one = true
        columns = nil
        db.results_as_hash = true
        db.execute("SELECT * FROM #{name}") do |row|
          if first_one
            puts row.inspect
            columns = row.keys
            @csv_file.puts columns.join(';') if asCsv
            first_one = false
          end
          @json_file.puts "\t" + row.to_json if asJson
          @yaml_file.puts YAML.dump([row])[4..-1] if asYaml
          @text_file.puts row.to_text if asText
          @csv_file.puts row.to_csv(name) if asCsv
          # break
        end
        
        @json_file.puts ']' if asJson

      rescue Exception => e
        puts "Une erreur s'est produite : #{e.message}"
        puts e.backtrace.join("\n")
      ensure
        @json_file && @json_file.close
        @yaml_file && @yaml_file.close
        @text_file && @text_file.close
        @csv_file && @csv_file.close
      end
    end
    
    def expath(name:, extension:) 
      File.join(db_folder, 'exports', "#{now_str}-#{name}.#{extension}")
    end
    def now_str
      @now_str ||= begin
        now = Time.now
        "#{now.year}-#{now.month}-#{now.day}-#{now.hour}"
      end
    end
    def json_path(name)
      expath(name: name, extension: 'json')
    end
    def yaml_path(name)
      expath(name: name, extension: 'yaml')
    end
    def text_path(name)
      expath(name: name, extension: 'txt')
    end
    def csv_path(name)
      expath(name: name, extension: 'csv')
    end
    
    # Pour mettre des données dans la base
    # 
    # @param name {String} Le nom de la table
    # @param data {Array<Hash>} Liste des données à injecter, avec des hash où les clés sont les colonnes
    def inject_data(name:, data:) 
      columns = data[0].keys.join(', ')
      interro = Array.new(data[0].keys.count, '?').join(', ')

      db.transaction
        smt = db.prepare("INSERT INTO #{name} (#{columns}) VALUES (#{interro})")
        data.each do |row_data|
          smt.execute( row_data.values )
        end
        smt.close
      db.commit
    end

    # Méthode pour vérifier le nombre de données injectée
    def check_data_count(name:, count:) 
      count_in_base = db.execute("SELECT COUNT(*) FROM #{name}")[0][0]
      puts "Table '#{name}' — Attendu #{count} / Count in base : #{count_in_base.inspect}"
      if count_in_base != count
        throw "Il y a une erreur de nombre de données dans la table #{name}\nAttendu: #{count} / Trouvé: #{count_in_base}"
        exit 1
      end
    end


    def prepare
      if File.exist?(db_path)
        File.delete(db_path)
      else
        puts "Le fichier DB n'a pas le bon path…"
        if File.exist?(db_folder) 
          puts "… mais le dossier existe bien !"
        else
          puts "… et le dossier n'existe pas non plus, ce qui révèle un problème"
          exit 1
        end
      end
      make_table_entries
      make_table_oeuvres
      make_table_exemples
      puts "\n--- Résultat ---"
      inspect_base
    end

    def make_table_entries
      make_table(
        name: 'entrees', 
        properties: {id: TEXT, entree: TEXT, genre: TEXT, categorie_id: TEXT, definition: TEXT},
        main_index: 'id'
      )
    end
    def make_table_oeuvres
      make_table(name: 'oeuvres', properties: {
        id: TEXT,
        titre_affiche: TEXT, titre_original: TEXT, titre_francais: TEXT,
        type: TEXT,
        annee: INT,
        auteurs: TEXT, notes: TEXT, resume: TEXT
      }, main_index: 'id')
    end

    def make_table_exemples
      make_table(
        name: 'exemples', 
        properties: {
          oeuvre_id: TEXT, indice: INT,
          entry_id: TEXT, content: TEXT, notes: TEXT
        },
        main_index: 'oeuvre_id, indice'
      )
    end

    def make_table(name:, properties:, main_index:)
      props = properties.map{|prop, type|
        "#{prop} #{type}"
    }.join(",\n")
      db.execute <<-SQL
      create table #{name} (
        #{props}
      );
      CREATE INDEX main_index ON #{name}(#{main_index});
      SQL
    end


    # Pour inspecter la base, c'est-à-dire voir comment elle est
    # constituée
    def inspect_base
      tables = db.execute("SELECT name FROM sqlite_master WHERE type='table';").flatten
      tables.each do |table|
        puts "Table: #{table}"
        columns = db.execute("PRAGMA table_info(#{table});")
        columns.each { |col| puts "  #{col[1]} (#{col[2]})" }
      end
    end

    def db
      @db ||= db = SQLite3::Database.new(db_path) 
    end
    def db_path
      @db_path ||= File.join(db_folder, 'dico.db')
    end
    def db_folder
      @db_folder ||= File.join(Dir.home, 'Library', "Application\ Support", "Code\ -\ Insiders", 'User', 'globalStorage', 'dico-cnario')
    end
  end #/<< self
end