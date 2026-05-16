import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseTree, Entry } from './parser';

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    output = vscode.window.createOutputChannel('create.tre');

    context.subscriptions.push(
        vscode.commands.registerCommand('createTre.createFromFile', createFromFile),
        vscode.commands.registerCommand('createTre.createFromSelection', createFromSelection),
        vscode.commands.registerCommand('createTre.previewFromSelection', previewFromSelection)
    );
}

export function deactivate() {}

// ── commands ──────────────────────────────────────────────────────────

async function createFromFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return vscode.window.showWarningMessage('open a .tre file first'); }

    const text = editor.document.getText();
    const baseDir = path.dirname(editor.document.uri.fsPath);
    await runCreate(text, baseDir);
}

async function createFromSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return vscode.window.showWarningMessage('no active editor'); }

    const selection = editor.document.getText(editor.selection);
    if (!selection.trim()) { return vscode.window.showWarningMessage('select a tree first'); }

    // base dir: folder of current file, or workspace root if unsaved
    let baseDir: string;
    if (editor.document.uri.scheme === 'file') {
        baseDir = path.dirname(editor.document.uri.fsPath);
    } else {
        const ws = vscode.workspace.workspaceFolders?.[0];
        if (!ws) { return vscode.window.showWarningMessage('no workspace folder'); }
        baseDir = ws.uri.fsPath;
    }

    await runCreate(selection, baseDir);
}

function previewFromSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return vscode.window.showWarningMessage('no active editor'); }

    const selection = editor.document.getText(editor.selection);
    if (!selection.trim()) { return vscode.window.showWarningMessage('select a tree first'); }

    const entries = parseTree(selection);
    output.clear();
    output.appendLine('preview — nothing will be written');
    output.appendLine('');
    for (const e of entries) {
        output.appendLine(`${e.isDirectory ? '[D]' : '[F]'} ${e.path}`);
    }
    output.appendLine('');
    output.appendLine(`${entries.length} entries.`);
    output.show();
}

// ── core ──────────────────────────────────────────────────────────────

async function runCreate(treeText: string, baseDir: string) {
    const entries = parseTree(treeText);
    if (entries.length === 0) { return vscode.window.showWarningMessage('no entries parsed'); }

    // confirm before doing anything
    const choice = await vscode.window.showInformationMessage(
        `create ${entries.length} entries in ${baseDir}?`,
        { modal: true },
        'create'
    );
    if (choice !== 'create') { return; }

    let created = 0;
    let skipped = 0;
    output.clear();
    output.appendLine(`base: ${baseDir}`);
    output.appendLine('');

    for (const e of entries) {
        const full = path.join(baseDir, e.path);
        try {
            if (fs.existsSync(full)) {
                output.appendLine(`skip   ${e.path} (exists)`);
                skipped++;
                continue;
            }
            if (e.isDirectory) {
                fs.mkdirSync(full, { recursive: true });
                output.appendLine(`mkdir  ${e.path}`);
            } else {
                // make sure parent dir exists for files at deeper paths
                fs.mkdirSync(path.dirname(full), { recursive: true });
                fs.writeFileSync(full, '');
                output.appendLine(`touch  ${e.path}`);
            }
            created++;
        } catch (err: any) {
            output.appendLine(`error  ${e.path} — ${err.message}`);
        }
    }

    output.appendLine('');
    output.appendLine(`${created} created, ${skipped} skipped.`);
    output.show();
    vscode.window.showInformationMessage(`created ${created}, skipped ${skipped}`);
}