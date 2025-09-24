import { PanelClass } from './panelClass';
import { Exemple } from '../../models/Exemple';
import { CanalExemple } from '../Rpc';

export class PanelClassExemple extends PanelClass {
  public modelClass = Exemple;
  protected _classe = Exemple; 
  protected canalRpc = CanalExemple; // @OBSOLETE
  protected _rpc = CanalExemple;
}