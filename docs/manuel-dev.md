# Manuel développement

[TOC]



## Console

Les trois consoles en bas de chaque panneau permet d’évaluer du code dans le cadre du panneau ou de la fenêtre. Si on est dans le panneau des entrées, on peut faire appel à la classe `Entry`. Par exemple `Entry.doesEntreeExist("Abandon")` va renvoyer « true » dans la console.

On peut définir n’importe quelle fonction dans la class `App` (celle côté webviews) et l’appeler en citant simplement son nom (si elle n’a pas besoin d’arguments) dans la console. On peut par exemple taper simplement `exportAllData` dans la console pour appeler l’export des données.

## Touches et raccourcis clavier

L’interface est pensée pour être entièrement contrôlée par des touches clavier (zéro mouse).

La plupart des choses sont gérées dans le module `src/webviews/services/VimLikeManager.ts`.

Ce module contient notamment une fonction `universelKeyboardCapture` qui est toujours appelée en premier et permet, notamment, de gérer les `flashAction` qui interrompent tout autre touche que les touches attendues (typiquement, les boites de dialogue « Confirmez-vous cette opération | Non | OUI ») ou permettant de gérer les `select` avec les flèches.

## Communication RPC inter-panneau

Les trois panneaux sont isolés. Pour communiquer de l'un à l'autre, on doit utiliser leur canal RPC en passant par l'extension.

Pour envoyer un message depuis le panneau P, on utilise le Rpc de ce panneau P (`RpcEntry`, `RpcOeuvre` ou `RpcExemple`). Si on attend pas de réponse, on utilise la méthode `notify` en communiquant de la commande et les données (personnellement, je préfère toujours utiliser `notify` car je ne comprends pas trop le fonction de `ask`). Par exemple :

~~~typescript
RpcEntry.notify('check-oeuvres', {oeuvres});
~~~

Le message est reçu côté extension dans le canal du panneau P qui a envoyé le message. Ici, par exemple, le canal `RpcEntry` défini dans le module `extension/service/Rpc.ts`. On met le message de réception dans la fonction `initialize` de `RpcEntry`.

On veut maintenant envoyer ce check au panneau des œuvres qui est celui qui peut répondre à la vérification. On utilise alors, côté extension (dans le même module `Rpc.ts`) le canal de communication avec le panneau Oeuvre, donc `RpcOeuvre`. Comme on ne peut pas atteindre directement le `rpc` de l'instance `CanalOeuvre` de ce canal, on passe par une méthode. 

~~~typescript
// Dans RpcEntry
this.rpc.on('check-oeuvre', async (params: {oeuvres: string[]}) => {
  CanalOeuvre.checkOeuvres(params);
});
~~~

~~~typescript
// Dans RpcOeuvre
checkOeuvres(params){
  RpcOeuvre.rpc.notify('check-oeuvres', params);
}
~~~

Ensuite, dans le panneau de réception (le panneau Oeuvre ici), on met le récepteur de ce message :

~~~typescript
// Dans webview/models/oeuvre.ts
RpcOeuvre.on('check-oeuvres', (params) => {
  console.log("[CLIENT-OEUVRE] réception d'une demande de vérification des oeuvres : ", params);
  // [suite ci-dessous]
~~~

Depuis cette fonction, on appelle la fonction qui va vérifier l'existence des œuvres transmises.

~~~typescript
  // [...]
  retour = Oeuvre.doOeuvresExist(oeuvres: string[])
  // [suite ci-dessous]
~~~

Et on appelle alors l'extension pour lui envoyer le résultat, comme on l'a fait depuis le panneau précédent pour le demander.

~~~typescript
RpcOeuvre.notify('check-oeuvres-resultat', {resultat: retour});
~~~

On réceptionne le message côté extension et on appelle le premier panneau (panneau des entrées) pour lui retourner le résultat.

~~~typescript
// Dans extension/service/Rpc.ts

// Dans RpcOeuvre.initialize
this.rpc.on('check-oeuvre-resultat', (params: {known: string[], unknown: string[]}) => {
  CanalEntry.resultatCheckingOeuvres(params);
});

// Dans RpcEntry
resultatCheckingOeuvres(params: {resultat: any}){
  this.rpc.notify('check-oeuvre-resultat', params);
}
~~~

Côté panneau initial, on peut récupérer le message et le résultat, de façon normal.

~~~typescript
RpcEntry.on('check-oeuvre-resultat', (params) => {
  //.... traitement ....
});
~~~

**NOTA BENE** : La classe `ComplexRpc` permet de gérer l'asynchronicité de ces requêtes Rcp complexes, interpanneaux et client<->serveur. Voir par exemple l'exemple concret de la vérification de l'existence des œuvres dans le checkItem du formulaire de la liste des entrées (`webviews/models/EntryForm.ts`).



---

## Aide contextuelle

Une aide contextuelle permet d'afficher des messages d'aide au milieu du panneau. Ils sont activités en appelant la méthode `Help.activateContextualHelp()` qui se sert de la propriété `context` du panneau pour savoir quelle aide afficher.

Toutes les aides sont définies dans le module `webviews/services/HelpManager`.

Par exemple, si l’on est dans le formulaire, on peut faire `this.panel.context='mon-context-particulier'`.  La propriété `Help.CHELPS` devra alors définir une clé 'mon-context-particulier' définissant l'aide particulière.

Chaque fois que le panneau passe dans un état, il définit son `context`, permettant à l'aide de savoir ce qu'il faut afficher en cas de demande d'aide. Cette aide est affichée à l'ouverture du premier panneau, pour afficher l'aide du contexte `start`.

Développement : Plus tard, on pourra imaginer pouvoir définir des valeurs contextuelles spéciales qui permettront d'afficher la pertinence de l'aide. 

Certains contextes peuvent également faire leur propre test pour afficher l'aide. Par exemple, quand on est en mode création d'entrée, le context peut vérifier si l'utilisateur est au début de l'opération (les champs principaux sont vides) ou à la fin (les champs principaux sont remplis) et fournir l'aide en conséquence. 

## Messagerie

Pour afficher un message, utiliser `<PanelClient>.flash(<message>, type)`.

Les types sont `notice`, `warn`, `error`ou le type spécial [`action`](#message-action).

Il existe, normalement, dans les panneaux, un raccourci pour utiliser directement `this.flash`.

<a name="message-action"></a>

### Messagerie avec action demandée

~~~javascript
// Map Court-circuit
const mapCC = new Map();
mapCC.set('n', this.annulation.bind(this));
mapCC.set('y', this.continue.bind(this));
const message = '<shortcut>n<shortcut> pour annuler et \
	<shortcut>y</shortcut> pour continuer';
this.panel.flashAction(message, mapCourtCircuit);
~~~

ou :

~~~typescript
mapCC.set('n', ['effet avec n', this.fn1.bind(this));
mapCC.set('o', ['effet avec o', this.fn2.bind(this));
~~~

Dans le deuxième cas, les raccourcis seront précisé en bas de panneau, dans le pied de page.

Le système de « message avec action demandée » est un système qui affiche un message et demande d'activer une touche pour choisir l'opération à affectuer (ou confirmer une action à faire).

Ce système utilise la capacité de `VimLikeManager.unverselKeyboardCapture` à capturer toutes les touches clavier avant tous les autres éléments. Quand un coupe-circuit est défini (`VimLikeManager.keyboardBypass`), cette méthode interrompt toute autre touche que celles attendues (p.e. 'n' et 'y' dans l'exemple ci-dessus).
