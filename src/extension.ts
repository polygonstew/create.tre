import * as vscode from 'vscode';
import { parseTree } from './parser';

const SAMPLE = `ollama_bpy_assistant/
├── __init__.py          # bl_info + register/unregister
├── panel.py             # UI definitions
├── operators.py         # Generate / Execute / Clear actions
├── ollama_client.py     # HTTP + threading
├── safety.py            # Forbidden-pattern filter
└── ARCHITECTURE.md      # this file
`;

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    output = vscode.window.createOutputChannel('create.tre');

    const testParser = vscode.commands.registerCommand('createTre.testParser', () => {
        output.clear();
        output.appendLine('parsing sample tree...');
        output.appendLine('');

        const entries = parseTree(SAMPLE);

        for (const e of entries) {
            const marker = e.isDirectory ? '[D]' : '[F]';
            output.appendLine(`${marker} ${e.path}`);
        }

        output.appendLine('');
        output.appendLine(`${entries.length} entries.`);
        output.show();
    });

    context.subscriptions.push(testParser);
}

export function deactivate() {}