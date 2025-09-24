import { Entry } from '../../models/Entry';
import { Exemple } from '../../models/Exemple';
import { Oeuvre } from '../../models/Oeuvre';
import { CanalEntry } from '../Rpc';
import { PanelClass } from './panelClass';

export class PanelClassEntry extends PanelClass {
  public modelClass = Entry;
  protected _classe = Entry; 
  protected canalRpc = CanalEntry; // @obsolete
  protected _rpc = CanalEntry;
}