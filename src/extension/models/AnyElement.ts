import { Entry } from './Entry';
import { Oeuvre } from './Oeuvre';
import { Exemple } from './Exemple';

export type AnyElementClass = typeof Entry | typeof Oeuvre | typeof Exemple ;
export type AnyElementType = Entry | Oeuvre | Exemple ;