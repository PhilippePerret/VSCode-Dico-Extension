import { AnyItemType } from "../../bothside/types";
import { PanelClient } from "../PanelClient";

export class ClipboardManager<T extends AnyItemType>{

  // La liste qui contient tout ce qui a été mis dans le
  // presse-papier.
  private container: string[] = [];
  private size: number = 0;

  constructor(
    private panel: PanelClient<T>
  ){
    this.container = [];
  }

  add(foo: any) {
    this.container.push(foo);
    if (this.container.length > 100) { this.container.shift(); }
    else { ++this.size; }
  }
  paste(){
    // Pour le moment, on prend toujours le dernier
    // à l'avenir, il sera possible de choisir un élément en particulier
    return this.container[this.size - 1];
  }
}