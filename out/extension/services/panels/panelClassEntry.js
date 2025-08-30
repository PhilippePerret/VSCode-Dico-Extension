"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelClassEntry = void 0;
const Entry_1 = require("../../models/Entry");
const Rpc_1 = require("../Rpc");
const panelClass_1 = require("./panelClass");
class PanelClassEntry extends panelClass_1.PanelClass {
    modelClass = Entry_1.Entry;
    _classe = Entry_1.Entry;
    canalRpc = Rpc_1.CanalEntry; // @obsolete
    _rpc = Rpc_1.CanalEntry;
}
exports.PanelClassEntry = PanelClassEntry;
//# sourceMappingURL=panelClassEntry.js.map