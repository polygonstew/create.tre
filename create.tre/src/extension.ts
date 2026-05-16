import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('create.tre active');

    const hello = vscode.commands.registerCommand('createTre.helloWorld', () => {
        vscode.window.showInformationMessage('hello from create.tre');
    });

    context.subscriptions.push(hello);
}

export function deactivate() {}