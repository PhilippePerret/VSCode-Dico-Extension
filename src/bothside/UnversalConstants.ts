import { IndentAction } from "vscode";
import { EntryType, OeuvreType, ExempleType, DBEntryType, DBOeuvreType, DBExempleType } from "./types";
import { UEntry } from "./UEntry";
import { UExemple } from "./UExemple";
import { UOeuvre } from "./UOeuvre";

export type TypeUnionClasse = typeof UEntry | typeof UOeuvre | typeof UExemple;
export type TypeUnionElement = UEntry | UOeuvre | UExemple;
export type TypeUnionDbType = DBEntryType | DBOeuvreType | DBExempleType;
export type TypeUnionItemType = EntryType | OeuvreType | ExempleType;
