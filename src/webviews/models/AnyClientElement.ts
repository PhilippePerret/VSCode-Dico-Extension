import { Entry } from "./Entry";
import { Exemple } from "./Exemple";
import { Oeuvre } from "./Oeuvre";

export type AnyElementType = Entry | Oeuvre | Exemple;
export type AnyElementClass = typeof Entry | typeof Oeuvre | typeof Exemple;
