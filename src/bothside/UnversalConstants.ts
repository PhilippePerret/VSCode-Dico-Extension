import { IndentAction } from "vscode";
import { IEntry } from "../extension/models/Entry";
import { IExemple } from "../extension/models/Exemple";
import { IOeuvre } from "../extension/models/Oeuvre";
import { UEntry } from "./UEntry";
import { UExemple } from "./UExemple";
import { UOeuvre } from "./UOeuvre";

export type TypeUnionClasse = typeof UEntry | typeof UOeuvre | typeof UExemple;
export type TypeUnionElement = UEntry | UOeuvre | UExemple;

export type TypeUnionIType = IEntry | IOeuvre | IExemple ;