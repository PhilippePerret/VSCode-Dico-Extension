require 'sqlite3'

TEXT = 'text'
INT = 'int'

class DB
  class << self
    
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
      puts "Je dois apprendre à préparer la base de données"
      puts "Path: #{db_path}"
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
      @db_folder ||= File.join(Dir.home, 'Library', "Application\ Support", 'Code - Insiders', 'User', 'globalStorage', 'undefined_publisher.dico-cnario')
    end
  end #/<< self
end