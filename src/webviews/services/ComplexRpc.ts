/**
 * ComplexRpc
 * 
 * Cette classe est amenée à gérer des traitements complexes car :
 *  - asynchrone
 *  - en Rpc
 * 
 * Il a été inauguré pour faire ça : 
 * Au cours du test de l'enregistrement d'une Entrée, on doit vérifier si toutes les
 * oeuvres citées existent et produire une erreur le cas échéant. La méthode de
 * check doit en même temps attendre et envoyer une chaine de notifications 
 * panneau -> extension -> panneau complexe.
 * 
 * Pour gérer ça, on fait une Promise en gardant dans l'instance ComplexRpc (repérée
 * par un identifiant)) le 'resolve' pour ne le jouer que lorsque tout est fini.
 * 
 * Fonctionnement :
 * 
 *    Dans le flux
 *    ------------
 *    const params = {...};
 *    const comp = new ComplexRpc({call: this.maFonctionInitiale.bind(this, params)});
 *    const res = await comp.run();
 * 
 *    Quelque part
 *    ------------
 *    maFonctionInitiale(liste: string[], compRpcId: string): void {
 *      // Ici on fait l'appel qu'on doit faire, en transmettant l'identifiant
 *      // Par exemple :
 *      RpcEntry.notify('check-oeuvres', {CRId: compRpcId, oeuvres: liste})
 *    }
 * 
 *    // Et dans la fonction finale qui reçoit le résultat du check
 *    RpcEntry.on('check-oeuvres-resultat', (params) => {
 *      ComplexRpc.resolveRequest(params.CRId, params.resultat);
 *      // Bien sûr, il faut s'assurer que CRId a bien été transmis
 *      // partout, à toutes les fonctions
 *    });
 * 
 */

export class ComplexRpc {
  static requestTable: Map<string, ComplexRpc> = new Map();
  
  static addRequest(req: ComplexRpc) {
    this.requestTable.set(req.id, req);
  }
  
  // À appeler à la fin, pour résoudre
  static resolveRequest(requestId: string, params: any) {
    (this.requestTable.get(requestId) as ComplexRpc).resolve(params);
  }

  public id: string;
  private call: Function; // Fonction qui va lancer l'appel (reçoit en DERNIER argument l'identifiant de cette instance — pour le transmettre)
  private ok!: Function; // le 'resolve' de new Promise((resolve, reject) => {})
  private ko!: Function; // le reject de new Promise((resolve,reject) => {})

  constructor(param: {
    call: Function,
  }) {
    this.id = crypto.randomUUID();
    this.call = param.call;
    ComplexRpc.addRequest(this);
  }

  run() { 
    return new Promise( (ok, ko) => {
      this.ok = ok;
      this.ko = ko;
      setTimeout(this.ko.bind(this, 'timeout-20'), 10 * 10000);
      this.call(this.id);
    });
  }

  resolve(params: any){
    this.ok(params);
  }
}