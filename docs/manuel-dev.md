# Manuel développement

## Aide contextuelle

Une aide contextuelle permet d'afficher des messages d'aide au milieu du panneau. Ils sont activités en appelant la méthode `Help.activateContextualHelp()` qui se sert de la propriété `context` du panneau pour savoir quelle aide afficher.

Toutes les aides sont définies dans le module `HelpManager`.

Chaque fois que le panneau passe dans un état, il définit sont `context`, permettant à l'aide de savoir ce qu'il faut afficher en cas de demande d'aide. Cette aide est affichée à l'ouverture du premier panneau, pour afficher l'aide du contexte `start`.

Développement : Plus tard, on pourra imaginer pouvoir définir des valeurs contextuelles spéciales qui permettront d'afficher la pertinence de l'aide. 

Certains contextes peuvent également faire leur propre test pour afficher l'aide. Par exemple, quand on est en mode création d'entrée, le context peut vérifier si l'utilisateur est au début de l'opération (les champs principaux sont vides) ou à la fin (les champs principaux sont remplis) et fournir l'aide en conséquence. 

## Messagerie

Pour afficher un message, utiliser `<PanelClient>.flash(<message>, type)`.

Les types sont `notice`, `warn`, `error`ou le type spécial [`action`](#message-action).

<a name="message-action"></a>

### Messagegie avec action demandée

~~~javascript
// Map Court-circuit
const mapCC = new Map();
mapCC.set('n', this.annulation.bind(this));
mapCC.set('y', this.continue.bind(this));
this.panel.flashAction(message, mapCourtCircuit);
~~~

Le système de "message avec action demandée" est un système qui affiche un message et demande d'activer une touche pour choisir l'opération à affectuer (ou confirmer une action à faire).

Ce système utilise la capacité de `VimLikeManager.unverselKeyboardCapture` à capturer toutes les touches clavier avant tous les autres éléments. Quand un coupe-circuit est défini (`VimLikeManager.keyboardBypass`), cette méthode interrompt toute autre touche que celles attendues (p.e. 'n' et 'y' dans l'exemple ci-dessus).

Les méthodes `flash` sont quant à elles définies dans le `PanelClient`.