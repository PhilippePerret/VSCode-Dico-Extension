"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelClassExemple = void 0;
const panelClass_1 = require("./panelClass");
const Exemple_1 = require("../../models/Exemple");
const Rpc_1 = require("../Rpc");
class PanelClassExemple extends panelClass_1.PanelClass {
    modelClass = Exemple_1.Exemple;
    _classe = Exemple_1.Exemple;
    canalRpc = Rpc_1.CanalExemple; // @OBSOLETE
    _rpc = Rpc_1.CanalExemple;
}
exports.PanelClassExemple = PanelClassExemple;
//# sourceMappingURL=panelClassExemple.js.map