# Manuel développement

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