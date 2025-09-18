import { FullEntry } from "../../extension/models/Entry";
import { FullExemple } from "../../extension/models/Exemple";
import { FullOeuvre } from "../../extension/models/Oeuvre";
import { Entry } from "./Entry";
import { Exemple } from "./Exemple";
import { Oeuvre } from "./Oeuvre";

export type AnyFullElementType = FullEntry | FullOeuvre | FullExemple;
export type AnyElementType = Entry | Oeuvre | Exemple ;
export type AnyElementClass = typeof Entry | typeof Oeuvre | typeof Exemple ;