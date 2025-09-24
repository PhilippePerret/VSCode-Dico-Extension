import { PanelClass } from './panelClass';
import { Oeuvre } from '../../models/Oeuvre';
import { CanalOeuvre } from '../Rpc';

export class PanelClassOeuvre extends PanelClass {
  public modelClass = Oeuvre;
  protected _classe = Oeuvre; 
  protected canalRpc = CanalOeuvre; // @OBSOLETE
  protected _rpc = CanalOeuvre;
}