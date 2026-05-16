"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
function activate(context) {
    console.log('create.tre active');
    const hello = vscode.commands.registerCommand('createTre.helloWorld', () => {
        vscode.window.showInformationMessage('hello from create.tre');
    });
    context.subscriptions.push(hello);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map