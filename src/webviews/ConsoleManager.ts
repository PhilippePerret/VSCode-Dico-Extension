import { PanelClient } from "./PanelClient";
import { App } from "./services/App";

/**
 * Pour gérer les consoles de chaque panneau
 */
export class ConsoleManager {
  private console: HTMLInputElement;
  private history: string[] = [];
  private ihistory: number = 0;

  constructor(private panel: PanelClient<any>) {
    this.console = panel.consoleInput as HTMLInputElement;
  }
  runCode() {
    // Il vaut évaluer l'expression
    const code = this.console.value;
    try {
      const result = (0, eval)(code);
      this.history.push(code);
      this.ihistory = this.history.length; // oui, vraiment
      this.console.value = '';
    } catch (error) {
      if ( false === App.eval(code)) {
        this.panel.flash("Ce code produit une erreur…", 'error');
        console.error(code, error);
      }
    }
  }
  setCode(){
    console.log("Console.setCode. History. iHistory", this.history, this.ihistory);
    this.console.value = this.history[this.ihistory];
  }
  backHistory(){
    if ( this.ihistory === 0) {
      console.log("Fin de l'historique");
      this.console.value = '';
      return;
    }
    this.ihistory --;
    this.setCode();
  }
  forwardHistory(){
    if ( this.ihistory === this.history.length - 1) {
      console.log("Bout de l'historique");
      return;
    }
    this.ihistory ++;
    this.setCode();
  }
}