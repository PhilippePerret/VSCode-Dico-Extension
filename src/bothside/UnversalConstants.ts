import { EntryType, OeuvreType, ExempleType, DBEntryType, DBOeuvreType, DBExempleType } from "./types";

export type TypeUnionDbType = DBEntryType | DBOeuvreType | DBExempleType;
export type TypeUnionItemType = EntryType | OeuvreType | ExempleType;
