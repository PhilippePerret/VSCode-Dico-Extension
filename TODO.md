# Todo list

* J'EN SUIS À :
  - Procédure d'ajout ou d'actualisation d'une donnée dans accessTable + Panneau
  - [si update]
      - actualisation de l'affichage
      - actualisation de la donnée dans accessTable
    - [Si create]
      - insertion au bon endroit dans l'affichage
      - intégration de la donnée dans accessTable

* BUGS À CORRIGER
  - quand je filtre et que je fais "f", ça ne sélectionne pas un des éléments affichés (avec la console, obtenir la valeur de l'item sélectionné)
  - quand je clique sur l'erreur, elle ne se ferme pas

* Traiter l'affichage de la définition
  - dim(…)
  - toutes les marques d'appel/index de définition (cf MARK_ENTRIES)
  - les marques oeuvres
  - les marques d'exemple
  - des liens pour rejoindre les éléments (les exemples, en l'occurence, et les définitions)
* Outils pour faciliter la création des exemples
* Quand on clique sur un élément : ça le sélectionne
* Un export pour Antidote (juste du texte)
* Bien activer le premier panneau au lancement, pour pouvoir utiliser les raccourcis tout de suite
* Script Donnée DB -> Fichier YAML/XML
  - avec tous les contrôles possibes pour ne rien perdre
    - nombre minimum de chaque element (définition > 700 etc.)
    - longueur minimale pour les définitions (si court, doit contenir "voir", "synonyme" ou "cf")
  - Pour le fichier XML, faire une DTD pour vérifier le bon format ?
* Mener la réflexion sur les raccourcis (ci-dessous)
* Avec un raccourci, p.e. "b" comme "backtrace" ou "l" comme "log", pouvoir afficher un panneau qui affiche les derniers messages programmes, quand on ne veut pas utiliser la console de développement.
* Pouvoir afficher les exemples seulement avec leur entrée (pour bien voir "titre de film" + entrées traitées)
* Quand un item est rendu invisible, si c'est l'item sélectionné du panneau, il faut le déselectionner
* Cadenas pour verrouiller l'identifiant d'un nouveau film ou d'un nouveau mot
  - ID du nouveau mot : doit absolument commencer comme le mot lui-même, après rationnalisation

* Faire un script (outil de l'extension) qui lance la fabrication du livre (Prawn-for-book en ruby).
* Pouvoir afficher tous les exemples associés à une entrée (la méthode `getByEntry` est déjà implémentée)

## Développement

* Faire une class `ItemsState` qui gère l'état des items de chaque panneau, aussi bien au niveau de l'affichage (affiché/masqué) qu'au niveau de la sélection.

## Fonctionnalités

* Ajout d'une nouvelle définition (possibilité de taper son nom dans le champ de recherche, avec 0 found, l'application demande s'il faut créer la nouvelle définition)
* Ajout d'un nouveau film. Champ de formulaire complexe avec possibilité de rechercher sur le net les données du film, par TMDB. Donc :
  - on tape "n" pour ajouter un nouveau film
  - on entre le titre du film dans un des champs titre, de préférence le titre original
  - un bouton permet de lancer la recherche des informations sur TDMB (on attend)
  - le retour d'information est traité, on en tire l'année, les auteurs (réalisateur, scénaristes, auteurs du texte original, etc.)
  - l'extension propose un id, à partir du titre et de l'année, modifiable (dès que l'id est modifié, on vérifie son unicité dans la table en cache)
  - on peut ajuster toute les données à la main, notamment préciser le sexe des intervenants
  - on valide et après check des informations, on persiste
* Ajout d'un nouvel exemple (à partir de pleins d'endroits : depuis une définition, on peut taper `ne` et ça ouvre un formulaire pour choisir le titre du film — ou alors ça bascule dans le champ de recherche du panneau Exemple ?, depuis un film, évidemment, toujours avec `ne` ou depuis le panneau exemple, de façon générale et pour chaque titre d'oeuvre)  
  - formulaire (auto complétion) pour choisir l'entrée concernée (on vérifie qu'il n'y pas déjà un exemple pour cette entrée)


## Plus tard

* Imaginer un script qui produise une simulation du livre dans un nouveau panneau (ou dans un navigateur) avec toutes les données formatées, les index, etc. (c'est quand même du boulot).

## Réflexion sur les raccourcis

Dans l'idée que tout doit pouvoir être gérer au clavier

### Raccourcis commun aux trois panneaux

* 'j' pour choisir l'item suivant, 'k' pour choisir/sélectionner l'item précédent
* 'nb' pour créer un nouvel item (dès qu'on tape 'n' => aide 'b' pour 'before' et 'a' pour 'after', ou 'p' pour previous ? et 'n' pour 'next' ?)
* 's' pour chercher (on focusse dans le champ de rechercher, les raccourcis vim-like disparaissent)
* 'c' pour rejoindre la console du panneau
* 'e' pour éditer l'item courant

Comment activer/désactiver les écouteurs d'évènements clavier.

---



<a name="version-2"></name>

### Idées directrices

* Toutes les données sont conservées (mises en cache et préparées) côté extension. Les panneaux font appel à l’extension lorsqu’ils ont besoin d’informations
* Pour la construction/gestion des panneaux, l’extension envoie toujours au panneau son propre cache de données (pour, par exemple, pouvoir gérer le filtrage des données sans appel à l’extension.)
* 
