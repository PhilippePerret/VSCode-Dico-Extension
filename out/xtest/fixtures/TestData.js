"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestData = void 0;
const Entry_1 = require("../../extension/models/Entry");
const Oeuvre_1 = require("../../extension/models/Oeuvre");
const Exemple_1 = require("../../extension/models/Exemple");
const EntryDb_1 = require("../../extension/db/EntryDb");
const OeuvreDb_1 = require("../../extension/db/OeuvreDb");
const ExempleDb_1 = require("../../extension/db/ExempleDb");
class TestData {
    // Test Entries (ordered to respect foreign key constraints)
    static ENTRIES = [
        // Entrées principales (catégories)
        {
            id: 'personnage',
            entree: 'Personnage',
            genre: 'nm',
            categorie_id: '',
            definition: 'Être fictif qui participe à l\'action d\'une œuvre narrative. Élément fondamental de la construction dramatique.'
        },
        {
            id: 'structure',
            entree: 'Structure',
            genre: 'nf',
            categorie_id: '',
            definition: 'Organisation générale d\'un récit, manière dont sont agencés les différents éléments narratifs.'
        },
        {
            id: 'theme',
            entree: 'Thème',
            genre: 'nm',
            categorie_id: '',
            definition: 'Idée centrale, message ou sujet principal développé dans une œuvre narrative.'
        },
        {
            id: 'dialogue',
            entree: 'Dialogue',
            genre: 'nm',
            categorie_id: '',
            definition: 'Échange verbal entre deux ou plusieurs personnages dans une œuvre dramatique.'
        },
        {
            id: 'genre',
            entree: 'Genre',
            genre: 'nm',
            categorie_id: '',
            definition: 'Classification d\'une œuvre selon ses caractéristiques formelles et thématiques.'
        },
        // Sous-catégories de personnage
        {
            id: 'antiheros',
            entree: 'Anti-héros',
            genre: 'nm',
            categorie_id: 'personnage',
            definition: 'Personnage principal qui ne possède pas les caractéristiques traditionnelles du héros. Il peut être lâche, égoïste, ou moralement ambigu.'
        },
        {
            id: 'protagoniste',
            entree: 'Protagoniste',
            genre: 'nm',
            categorie_id: 'personnage',
            definition: 'Personnage principal d\'une histoire, celui qui mène l\'action et autour duquel s\'articule l\'intrigue.'
        },
        {
            id: 'antagoniste',
            entree: 'Antagoniste',
            genre: 'nm',
            categorie_id: 'personnage',
            definition: 'Personnage qui s\'oppose au protagoniste et constitue l\'obstacle principal à ses objectifs.'
        },
        {
            id: 'mentor',
            entree: 'Mentor',
            genre: 'nm',
            categorie_id: 'personnage',
            definition: 'Personnage sage qui guide et conseille le héros dans son parcours initiatique.'
        },
        // Sous-catégories de structure
        {
            id: 'flashback',
            entree: 'Flash-back',
            genre: 'nm',
            categorie_id: 'structure',
            definition: 'Technique narrative consistant à revenir en arrière dans le temps pour raconter des événements antérieurs à l\'action principale.'
        },
        {
            id: 'climax',
            entree: 'Climax',
            genre: 'nm',
            categorie_id: 'structure',
            definition: 'Point culminant de l\'intrigue, moment de plus forte tension dramatique où le conflit principal atteint son paroxysme.'
        },
        {
            id: 'exposition',
            entree: 'Exposition',
            genre: 'nf',
            categorie_id: 'structure',
            definition: 'Partie initiale du récit qui présente les personnages, le cadre et la situation de départ.'
        },
        {
            id: 'denouement',
            entree: 'Dénouement',
            genre: 'nm',
            categorie_id: 'structure',
            definition: 'Résolution finale de l\'intrigue, où les conflits trouvent leur issue.'
        },
        {
            id: 'inciting_incident',
            entree: 'Incident déclencheur',
            genre: 'nm',
            categorie_id: 'structure',
            definition: 'Événement qui met l\'histoire en mouvement et pousse le protagoniste à agir.'
        },
        // Sous-catégories de genre
        {
            id: 'comedie',
            entree: 'Comédie',
            genre: 'nf',
            categorie_id: 'genre',
            definition: 'Genre dramatique dont le but principal est de divertir et de faire rire le public.'
        },
        {
            id: 'tragedie',
            entree: 'Tragédie',
            genre: 'nf',
            categorie_id: 'genre',
            definition: 'Genre dramatique représentant des personnages illustres aux prises avec des passions fatales.'
        },
        {
            id: 'thriller',
            entree: 'Thriller',
            genre: 'nm',
            categorie_id: 'genre',
            definition: 'Genre narratif caractérisé par un suspense constant et une tension dramatique élevée.'
        },
        {
            id: 'western',
            entree: 'Western',
            genre: 'nm',
            categorie_id: 'genre',
            definition: 'Genre cinématographique se déroulant dans l\'Ouest américain du XIXe siècle.'
        },
        // Techniques narratives
        {
            id: 'metaphore',
            entree: 'Métaphore',
            genre: 'nf',
            categorie_id: '',
            definition: 'Figure de style qui consiste à désigner une réalité par un autre terme que celui qui lui convient.'
        },
        {
            id: 'symbole',
            entree: 'Symbole',
            genre: 'nm',
            categorie_id: '',
            definition: 'Élément concret qui représente une idée abstraite ou un concept plus large.'
        },
        {
            id: 'foreshadowing',
            entree: 'Préfiguration',
            genre: 'nf',
            categorie_id: '',
            definition: 'Technique consistant à annoncer subtilement des événements futurs de l\'histoire.'
        },
        {
            id: 'ironie',
            entree: 'Ironie',
            genre: 'nf',
            categorie_id: '',
            definition: 'Procédé qui consiste à dire le contraire de ce que l\'on pense ou à créer un décalage entre les attentes et la réalité.'
        },
        {
            id: 'MacGuffin',
            entree: 'MacGuffin',
            genre: 'nm',
            categorie_id: '',
            definition: 'Objet, événement ou personnage qui déclenche l\'intrigue mais dont l\'importance réelle est secondaire.'
        },
        {
            id: 'red_herring',
            entree: 'Red Herring',
            genre: 'nm',
            categorie_id: '',
            definition: 'Fausse piste délibérément placée pour égarer le lecteur ou spectateur.'
        },
        // Nouvelles entrées pour les exemples supplémentaires
        {
            id: 'motivation',
            entree: 'Motivation',
            genre: 'nf',
            categorie_id: '',
            definition: 'Forces intérieures qui poussent un personnage à agir et à poursuivre ses objectifs.'
        },
        {
            id: 'dimensions',
            entree: 'Dimensions du personnage',
            genre: 'nf',
            categorie_id: 'personnage',
            definition: 'Différents aspects de la personnalité et de la vie d\'un personnage (travail, famille, amour, santé, etc.).'
        },
        {
            id: 'competence',
            entree: 'Compétence',
            genre: 'nf',
            categorie_id: 'personnage',
            definition: 'Capacité particulière d\'un personnage qui lui permet de résoudre des problèmes ou d\'atteindre ses objectifs.'
        },
        {
            id: 'objectif',
            entree: 'Objectif',
            genre: 'nm',
            categorie_id: '',
            definition: 'But que poursuit un personnage tout au long de l\'histoire.'
        },
        {
            id: 'ironie_dramatique',
            entree: 'Ironie dramatique',
            genre: 'nf',
            categorie_id: 'ironie',
            definition: 'Situation où le spectateur connaît des informations que certains personnages ignorent.'
        },
        {
            id: 'danger',
            entree: 'Danger',
            genre: 'nm',
            categorie_id: '',
            definition: 'Menace qui pèse sur un personnage et crée de la tension dramatique.'
        },
        {
            id: 'fin_paradoxale',
            entree: 'Fin paradoxale',
            genre: 'nf',
            categorie_id: 'structure',
            definition: 'Dénouement où le personnage atteint son objectif mais à un prix inattendu.'
        },
        {
            id: 'question_dramatique',
            entree: 'Question dramatique fondamentale',
            genre: 'nf',
            categorie_id: 'structure',
            definition: 'Question centrale qui maintient l\'intérêt du spectateur tout au long du récit.'
        },
        {
            id: 'conflit',
            entree: 'Conflit fondamental',
            genre: 'nm',
            categorie_id: '',
            definition: 'Opposition principale qui structure l\'ensemble du récit.'
        },
        {
            id: 'adaptation',
            entree: 'Adaptation',
            genre: 'nf',
            categorie_id: '',
            definition: 'Transposition d\'une œuvre d\'un média vers un autre (roman vers film, etc.).'
        },
        {
            id: 'forme_flashback',
            entree: 'Forme flashback',
            genre: 'nf',
            categorie_id: 'flashback',
            definition: 'Structure narrative où l\'ensemble du récit est présenté comme un retour en arrière.'
        },
        {
            id: 'ca',
            entree: 'Ça',
            genre: 'nm',
            categorie_id: 'personnage',
            definition: 'Voir en philosophie ce que ça représente.'
        },
        {
            id: 'ecriture',
            entree: 'Écriture',
            genre: 'nf',
            categorie_id: '',
            definition: 'Domaine dans lequel on se sert de l’écrit pour produire des livres et également son résultat.'
        }
    ];
    // Test Oeuvres
    static OEUVRES = [
        {
            id: 'PULP94',
            titre_affiche: 'Pulp Fiction',
            titre_original: 'Pulp Fiction',
            titre_francais: undefined,
            annee: 1994,
            auteurs: 'Quentin TARANTINO (H, réalisateur, scénariste)',
            notes: 'Personnages principaux: Vincent Vega (John TRAVOLTA), Jules Winnfield (Samuel L. JACKSON), Mia Wallace (Uma THURMAN)',
            resume: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.'
        },
        {
            id: 'CITIZ41',
            titre_affiche: 'Citizen Kane',
            titre_original: 'Citizen Kane',
            titre_francais: undefined,
            annee: 1941,
            auteurs: 'Orson WELLES (H, réalisateur, scénariste), Herman J. MANKIEWICZ (H, scénariste)',
            notes: 'Personnages: Charles Foster Kane (Orson WELLES), Susan Alexander (Dorothy OMINGORE)',
            resume: 'Following the death of publishing tycoon Charles Foster Kane, reporters scramble to discover the meaning of his final word.'
        },
        {
            id: 'GOODF90',
            titre_affiche: 'Les Affranchis',
            titre_original: 'Goodfellas',
            titre_francais: 'Affranchis (Les)',
            annee: 1990,
            auteurs: 'Martin SCORSESE (H, réalisateur, scénariste), Nicholas PILEGGI (H, scénariste)',
            notes: 'Personnages: Henry Hill (Ray LIOTTA), Jimmy Conway (Robert DE NIRO), Tommy DeVito (Joe PESCI)',
            resume: 'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners.'
        },
        {
            id: 'CASAB42',
            titre_affiche: 'Casablanca',
            titre_original: 'Casablanca',
            titre_francais: undefined,
            annee: 1942,
            auteurs: 'Michael CURTIZ (H, réalisateur), Julius J. EPSTEIN (H, scénariste)',
            notes: 'Personnages: Rick Blaine (Humphrey BOGART), Ilsa Lund (Ingrid BERGMAN)',
            resume: 'A cynical American expatriate struggles to decide whether or not he should help his former lover and her fugitive husband escape French Morocco.'
        },
        {
            id: 'DITD',
            titre_affiche: 'Dancer in the Dark',
            titre_original: 'Dancer in the Dark',
            titre_francais: undefined,
            annee: 2000,
            auteurs: 'Lars VON TRIER (H, réalisateur, scénariste)',
            notes: 'Personnages: Selma (Björk), Bill Houston (David MORSE), Gene (Vladica KOSTIC)',
            resume: 'An Eastern European immigrant who loves musicals struggles to make ends while going blind, in order to pay for her son\'s eye operation.'
        },
        {
            id: 'HER13',
            titre_affiche: 'Her',
            titre_original: 'Her',
            titre_francais: undefined,
            annee: 2013,
            auteurs: 'Spike JONZE (H, réalisateur, scénariste)',
            notes: 'Personnages: Theodore (Joaquin PHOENIX), Samantha (Scarlett JOHANSSON, voix)',
            resume: 'A sensitive writer develops an unlikely relationship with an operating system designed to meet his every need.'
        },
        {
            id: 'ARV16',
            titre_affiche: 'Arrival',
            titre_original: 'Arrival',
            titre_francais: 'Premier Contact',
            annee: 2016,
            auteurs: 'Denis VILLENEUVE (H, réalisateur), Eric HEISSERER (H, scénariste)',
            notes: 'Personnages: Louise Banks (Amy ADAMS), Ian Donnelly (Jeremy RENNER)',
            resume: 'A linguist is recruited by the military to communicate with alien lifeforms after twelve mysterious spacecrafts appear around the world.'
        },
        {
            id: 'WHIP14',
            titre_affiche: 'Whiplash',
            titre_original: 'Whiplash',
            titre_francais: undefined,
            annee: 2014,
            auteurs: 'Damien CHAZELLE (H, réalisateur, scénariste)',
            notes: 'Personnages: Andrew (Miles TELLER), Fletcher (J.K. SIMMONS)',
            resume: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student\'s potential.'
        },
        {
            id: 'AMA84',
            titre_affiche: 'Amadeus',
            titre_original: 'Amadeus',
            titre_francais: undefined,
            annee: 1984,
            auteurs: 'Miloš FORMAN (H, réalisateur), Peter SHAFFER (H, scénariste)',
            notes: 'Personnages: Antonio Salieri (F. Murray ABRAHAM), Wolfgang Mozart (Tom HULCE)',
            resume: 'The life, success and troubles of Wolfgang Amadeus Mozart, as told by Antonio Salieri, the contemporaneous composer who was insanely jealous of Mozart\'s talent and claimed to have murdered him.'
        },
        {
            id: 'MR02',
            titre_affiche: 'Minority Report',
            titre_original: 'Minority Report',
            titre_francais: undefined,
            annee: 2002,
            auteurs: 'Steven SPIELBERG (H, réalisateur), Scott FRANK (H, scénariste)',
            notes: 'Personnages: John Anderton (Tom CRUISE), Agatha (Samantha MORTON)',
            resume: 'In a future where a special police unit is able to arrest murderers before they commit their crimes, an officer from that unit is himself accused of a future murder.'
        }
    ];
    // Test Exemples (avec cas limites pour tester l'affichage groupé)
    static EXEMPLES = [
        // PULP94 - 3 exemples avec indices non continus (2, 4, 7)
        {
            oeuvre_id: 'PULP94',
            indice: 4,
            entry_id: 'structure',
            content: 'Le film TITRE utilise une structure narrative non-linéaire en trois actes qui s\'entremêleent : "Vincent Vega et la femme de Marcellus Wallace", "La montre en or", "La situation de Bonnie".',
            notes: 'Structure en chapitres'
        },
        {
            oeuvre_id: 'PULP94',
            indice: 2,
            entry_id: 'antiheros',
            content: 'dans TITRE, Vincent Vega incarne parfaitement l\'anti-héros : tueur à gages professionnel mais aussi amateur de hamburgers et de films de série B, il mélange violence et banalité du quotidien.',
            notes: 'Scène du restaurant avec Mia Wallace'
        },
        {
            oeuvre_id: 'PULP94',
            indice: 7,
            entry_id: 'climax',
            content: 'Le climax de TITRE peut être considéré comme la scène du restaurant mexicain avec Honey Bunny et Pumpkin, bouclant la boucle narrative.',
            notes: 'Fin cyclique du film'
        },
        // CITIZ41 - 1 seul exemple
        {
            oeuvre_id: 'CITIZ41',
            indice: 1,
            entry_id: 'flashback',
            content: 'Toute la narration de TITRE repose sur une série de flashbacks racontés par différents témoins de la vie de Kane, chacun apportant sa perspective sur le personnage.',
            notes: 'Structure d\'enquête journalistique'
        },
        // GOODF90 - 2 exemples normaux (mélangés dans l'ordre)
        {
            oeuvre_id: 'GOODF90',
            indice: 2,
            entry_id: 'climax',
            content: 'Le climax du film TITRE survient lors de la journée paranoiaïaque d\'Henry Hill sous cocaïne, culminant avec son arrestation et sa décision de devenir indicateur.',
            notes: 'Séquence de la journée de cocaïne'
        },
        {
            oeuvre_id: 'GOODF90',
            indice: 1,
            entry_id: 'antiheros',
            content: 'Henry Hill représente l\'anti-héros par excellence : il admire et aspire à faire partie de la mafia tout en étant fondamentalement lâche et en finissant par trahir ses complices.',
            notes: 'Narration à la première personne'
        },
        // CASAB42 - 1 exemple normal (pour le film qui existe)
        {
            oeuvre_id: 'CASAB42',
            indice: 1,
            entry_id: 'personnage',
            content: 'Rick Blaine dans TITRE illustre le personnage en évolution : d\'abord cynique et désenchané, il retrouve son humanité et ses idéaux.',
            notes: 'Arc de transformation du héros'
        },
        // DITD - 8 exemples (film le plus documenté)
        {
            oeuvre_id: 'DITD',
            indice: 1,
            entry_id: 'climax',
            content: 'Selma va être pendue. La tension est extrême pour savoir si son objectif a été atteint ou non (l\'opération des yeux de son fils Gene).',
            notes: 'Moment culminant du film'
        },
        {
            oeuvre_id: 'DITD',
            indice: 2,
            entry_id: 'ironie_dramatique',
            content: 'Le flic Bill Houston fait semblant de sortir de la caravane de Selma. Selma, aveugle ne s\'aperçoit pas qu\'il est resté à l\'intérieur pour voir où elle range son argent.',
            notes: 'Auteur: Bill Houston, victime: Selma'
        },
        {
            oeuvre_id: 'DITD',
            indice: 3,
            entry_id: 'danger',
            content: 'Lorsque Selma veut travailler de nuit, on devine qu\'elle se met gravement en danger.',
            notes: 'Préfiguration des conséquences'
        },
        {
            oeuvre_id: 'DITD',
            indice: 4,
            entry_id: 'motivation',
            content: 'Selma est évidemment animée par un sentiment de culpabilité fort vis-à-vis de Gene, d\'autant qu\'elle savait qu\'il hériterait de sa maladie des yeux.',
            notes: 'Force motrice principale'
        },
        {
            oeuvre_id: 'DITD',
            indice: 5,
            entry_id: 'dimensions',
            content: 'Selma est emboutisseuse (dimension Travail), devient aveugle (dimension Santé), vit avec son fils Gene (dimension Famille).',
            notes: 'Multiples aspects du personnage'
        },
        {
            oeuvre_id: 'DITD',
            indice: 6,
            entry_id: 'competence',
            content: 'Sans sa détermination sans faille, Selma ne pourrait atteindre son objectif.',
            notes: 'Compétence psychologique essentielle'
        },
        {
            oeuvre_id: 'DITD',
            indice: 7,
            entry_id: 'fin_paradoxale',
            content: 'Selma parvient à payer l\'opération des yeux de son fils Gene MAIS au prix de sa propre vie.',
            notes: 'Réussite et sacrifice simultanés'
        },
        {
            oeuvre_id: 'DITD',
            indice: 8,
            entry_id: 'question_dramatique',
            content: 'Selma parviendra-t-elle à payer l\'opération des yeux de son fils Gene ?',
            notes: 'Question centrale du récit'
        },
        // HER13 - 5 exemples
        {
            oeuvre_id: 'HER13',
            indice: 1,
            entry_id: 'personnage',
            content: 'Samantha est un système d\'exploitation d\'ordinateur.',
            notes: 'Personnage principal non-humain'
        },
        {
            oeuvre_id: 'HER13',
            indice: 2,
            entry_id: 'dimensions',
            content: 'Theodore est écrivain public (dimension Travail), divorcé d\'une femme qu\'il aime encore (dimension Amour), partage une amitié forte avec Amy (dimension amicale).',
            notes: 'Profil complexe du protagoniste'
        },
        {
            oeuvre_id: 'HER13',
            indice: 3,
            entry_id: 'competence',
            content: 'Theodore est doué pour l\'écriture, il finira par éditer un livre.',
            notes: 'Talent qui lui permet d\'évoluer'
        },
        {
            oeuvre_id: 'HER13',
            indice: 4,
            entry_id: 'fin_paradoxale',
            content: 'Theodore réussit à faire le deuil de son couple, mais il perdra l\'amour de Samantha.',
            notes: 'Gains et pertes simultanés'
        },
        {
            oeuvre_id: 'HER13',
            indice: 5,
            entry_id: 'objectif',
            content: 'Theodore doit faire le deuil de son couple.',
            notes: 'Objectif égoïste mais nécessaire'
        },
        // ARV16 - 4 exemples
        {
            oeuvre_id: 'ARV16',
            indice: 1,
            entry_id: 'forme_flashback',
            content: 'Le début est un long flash-forward nous projetant déjà à la fin de l\'histoire lorsque Louise aura accouché de sa fille malade.',
            notes: 'Structure temporelle complexe'
        },
        {
            oeuvre_id: 'ARV16',
            indice: 2,
            entry_id: 'competence',
            content: 'Louise est linguiste, raison pour laquelle on l\'embauchera.',
            notes: 'Expertise professionnelle cruciale'
        },
        {
            oeuvre_id: 'ARV16',
            indice: 3,
            entry_id: 'theme',
            content: 'Un des thèmes principaux est *la communication*.',
            notes: 'Thématique centrale du film'
        },
        {
            oeuvre_id: 'ARV16',
            indice: 4,
            entry_id: 'objectif',
            content: 'Louise doit déchiffrer la langue des extraterrestres pour permettre aux gouvernements de communiquer avec eux.',
            notes: 'Objectif altruiste et urgent'
        },
        // WHIP14 - 3 exemples
        {
            oeuvre_id: 'WHIP14',
            indice: 1,
            entry_id: 'objectif',
            content: 'Andrew réussira s\'il atteint le tempo très précis (une vitesse) fixé par son prof.',
            notes: 'Objectif tangible et mesurable'
        },
        {
            oeuvre_id: 'WHIP14',
            indice: 2,
            entry_id: 'antiheros',
            content: 'Le prof a un rôle d\'allié dans le sens où sa rigueur permet au protagoniste d\'évoluer et en même temps d\'ennemi en l\'exposant à la souffrance au point de le faire renoncer.',
            notes: 'Personnage ambivalent complexe'
        },
        {
            oeuvre_id: 'WHIP14',
            indice: 3,
            entry_id: 'objectif',
            content: 'Andrew doit atteindre un tempo très précis pour jouer le morceau.',
            notes: 'Défi technique concret'
        },
        // AMA84 - 6 exemples
        {
            oeuvre_id: 'AMA84',
            indice: 1,
            entry_id: 'forme_flashback',
            content: 'On commence par la tentative de suicide de Salieri, et son internement, pour ensuite, par flashbacks successifs, présenter tout le passé qui a conduit Salieri au suicide.',
            notes: 'Structure en récit encadré'
        },
        {
            oeuvre_id: 'AMA84',
            indice: 2,
            entry_id: 'dimensions',
            content: 'Salieri est compositeur (dimension Travail), vient d\'une famille où l\'art n\'existait pas (dimension Famille), a fait vœu de chasteté (dimension Amour), est très gourmand (dimension Passion).',
            notes: 'Portrait multidimensionnel'
        },
        {
            oeuvre_id: 'AMA84',
            indice: 3,
            entry_id: 'adaptation',
            content: 'TITRE, adaptation de la pièce de Peter Shaffer.',
            notes: 'Transposition théâtre vers cinéma'
        },
        {
            oeuvre_id: 'AMA84',
            indice: 4,
            entry_id: 'protagoniste',
            content: 'Dans la première partie de TITRE, Salieri est protagoniste et Mozart antagoniste, les deux rôles s\'inversent dans la seconde.',
            notes: 'Dynamique des rôles narratifs'
        },
        {
            oeuvre_id: 'AMA84',
            indice: 5,
            entry_id: 'climax',
            content: 'Salieri brûle sa croix, acte hautement symbolique quand on sait qu\'il avait dévolu sa vie à Dieu. Cette clé sépare les deux parties du film.',
            notes: 'Point de bascule dramatique'
        },
        {
            oeuvre_id: 'AMA84',
            indice: 6,
            entry_id: 'personnage',
            content: 'Dans TITRE, la vie de Mozart est racontée par Salieri, son admirateur-ennemi.',
            notes: 'Récit biographique subjectif'
        },
        // MR02 - 6 exemples
        {
            oeuvre_id: 'MR02',
            indice: 1,
            entry_id: 'conflit',
            content: 'Le conflit principal de John Anderton est d\'être pris pour un futur meurtrier.',
            notes: 'Paradoxe central du récit'
        },
        {
            oeuvre_id: 'MR02',
            indice: 2,
            entry_id: 'motivation',
            content: 'Les motivations de John Anderton sont doubles : il doit absolument échapper à son sort (la prison) et il veut comprendre ce meurtre futur dont les algorithmes l\'accusent.',
            notes: 'Double motivation défensive et cognitive'
        },
        {
            oeuvre_id: 'MR02',
            indice: 3,
            entry_id: 'dimensions',
            content: 'John travaille à Precrime (dimension Profession), est divorcé suite à l\'enlèvement de son fils Sean (dimension Famille), se drogue pour oublier (dimension Santé).',
            notes: 'Profil personnel et professionnel'
        },
        {
            oeuvre_id: 'MR02',
            indice: 4,
            entry_id: 'competence',
            content: 'John sait déchiffrer les images mieux que personne, ce qui lui permettra de démasquer son patron.',
            notes: 'Expertise qui devient cruciale'
        },
        {
            oeuvre_id: 'MR02',
            indice: 5,
            entry_id: 'fin_paradoxale',
            content: 'John révèle le pot-aux-roses et coince son patron, mais condamne Precrime, projet pourtant prometteur.',
            notes: 'Victoire aux conséquences ambiguës'
        },
        {
            oeuvre_id: 'MR02',
            indice: 6,
            entry_id: 'adaptation',
            content: 'TITRE, adaptation de la nouvelle de Philip K. Dick.',
            notes: 'Transposition nouvelle vers film'
        }
        // CAS LIMITES TEMPORAIREMENT COMMENTÉS (problème FK contraintes) :
        // TODO: Implémenter la gestion des données orphelines
        // 
        // // Exemple orphelin - film qui n'existe pas
        // {
        //     oeuvre_id: 'NONEXISTENT_FILM',
        //     indice: 1,
        //     entry_id: 'structure',
        //     content: 'Cet exemple fait référence à un film qui n\'existe pas dans la base de données.',
        //     notes: 'Film orphelin pour test'
        // },
        // 
        // // Exemple orphelin - entry_id qui n'existe pas
        // {
        //     oeuvre_id: 'CITIZ41',
        //     indice: 3,
        //     entry_id: 'NONEXISTENT_ENTRY',
        //     content: 'Cet exemple fait référence à une entrée qui n\'existe pas dans le dictionnaire.',
        //     notes: 'Entrée orpheline pour test'
        // }
    ];
    /**
     * Populate test database with fixture data
     */
    static async populateTestDatabase(dbService) {
        const entryDb = new EntryDb_1.EntryDb(dbService);
        const oeuvreDb = new OeuvreDb_1.OeuvreDb(dbService);
        const exempleDb = new ExempleDb_1.ExempleDb(dbService);
        // IMPORTANT: Ne JAMAIS vider la base automatiquement
        // L'ancienne instruction await dbService.clearAllData() a été supprimée
        // Insert entries
        for (const entryData of this.ENTRIES) {
            const entry = new Entry_1.Entry(entryData);
            await entryDb.create(entry);
        }
        // Insert oeuvres
        for (const oeuvreData of this.OEUVRES) {
            const oeuvre = new Oeuvre_1.Oeuvre(oeuvreData);
            await oeuvreDb.create(oeuvre);
        }
        // Insert exemples
        for (const exempleData of this.EXEMPLES) {
            const exemple = new Exemple_1.Exemple(exempleData);
            await exempleDb.create(exemple);
        }
    }
    /**
     * Get expected counts for validation
     */
    static getExpectedCounts() {
        return {
            entries: this.ENTRIES.length,
            oeuvres: this.OEUVRES.length,
            exemples: this.EXEMPLES.length
        };
    }
    /**
     * Get specific test data for assertions
     */
    static getTestEntry(id) {
        return this.ENTRIES.find(entry => entry.id === id);
    }
    static getTestOeuvre(id) {
        return this.OEUVRES.find(oeuvre => oeuvre.id === id);
    }
    static getTestExemplesForOeuvre(oeuvreId) {
        return this.EXEMPLES.filter(exemple => exemple.oeuvre_id === oeuvreId);
    }
}
exports.TestData = TestData;
//# sourceMappingURL=TestData.js.map