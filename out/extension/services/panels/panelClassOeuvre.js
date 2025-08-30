"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelClassOeuvre = void 0;
const panelClass_1 = require("./panelClass");
const Oeuvre_1 = require("../../models/Oeuvre");
const Rpc_1 = require("../Rpc");
class PanelClassOeuvre extends panelClass_1.PanelClass {
    modelClass = Oeuvre_1.Oeuvre;
    _classe = Oeuvre_1.Oeuvre;
    canalRpc = Rpc_1.CanalOeuvre; // @OBSOLETE
    _rpc = Rpc_1.CanalOeuvre;
}
exports.PanelClassOeuvre = PanelClassOeuvre;
//# sourceMappingURL=panelClassOeuvre.js.map