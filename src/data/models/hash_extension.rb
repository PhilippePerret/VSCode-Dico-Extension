class Hash

  LONGKEY_TO_SHORTKEY = {
    # Communs
    'id' => 'id', 
    'notes' => 'n',
    # Oeuvres
    'titre_affiche' => 'taf',
    'titre_original' => 'tor',
    'titre_francais' => 'tfr',
    'type' => 't',
    'annee' => 'an',
    'auteurs' => 'au',
    'resume' => 'r',
    # Entrées
    'entree' => 'e',
    'genre' => 'g',
    'categorie_id' => 'c',
    'definition' => 'd',
    # Exemples
    'oeuvre_id' => 'o',
    'indice' => 'i',
    'entry_id' => 'e',
    'content' => 'c',
  }

  def to_text
    self.map do |k, v|
        (LONGKEY_TO_SHORTKEY[k] || k) + ':' + v.to_s
    end.join("\n") + "\n---"
  end

  # Transforme en donnée CSV string
  def to_csv(table)
    case table
    when 'exemples' then self['content'] = "\"#{self['content']}\""
    when 'entrees' then self['definition'] = "\"#{self['definition']}\""
    end
    self.values.join(';')
  end

end