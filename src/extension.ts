import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseTree } from './parser';

let output: vscode.OutputChannel;

const IGNORE = new Set(['.git', 'node_modules', '__pycache__', 'out', 'dist', '.venv', '.vscode-test']);

export function activate(context: vscode.ExtensionContext) {
    output = vscode.window.createOutputChannel('create.tre');
    output.appendLine('create.tre activated');
    console.log('create.tre activated');

    context.subscriptions.push(
        vscode.commands.registerCommand('createTre.createFromFile', createFromFile),
        vscode.commands.registerCommand('createTre.createFromSelection', createFromSelection),
        vscode.commands.registerCommand('createTre.previewFromSelection', previewFromSelection),
        vscode.commands.registerCommand('createTre.folderToTree', folderToTree),
    );
}

export function deactivate() {}

// ── create from .tre file ─────────────────────────────────────────────

async function createFromFile(uri?: vscode.Uri) {
    let text: string;
    let baseDir: string;

    if (uri && uri.fsPath) {
        text = fs.readFileSync(uri.fsPath, 'utf8');
        baseDir = path.dirname(uri.fsPath);
    } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('open a .tre file first');
            return;
        }
        text = editor.document.getText();
        baseDir = editor.document.uri.scheme === 'file'
            ? path.dirname(editor.document.uri.fsPath)
            : (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '');
    }

    if (!baseDir) {
        vscode.window.showWarningMessage('no workspace folder');
        return;
    }
    await runCreate(text, baseDir);
}

// ── create from selected text ─────────────────────────────────────────

async function createFromSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showWarningMessage('no active editor'); return; }

    const sel = editor.document.getText(editor.selection);
    if (!sel.trim()) { vscode.window.showWarningMessage('select a tree first'); return; }

    const baseDir = editor.document.uri.scheme === 'file'
        ? path.dirname(editor.document.uri.fsPath)
        : (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '');

    if (!baseDir) { vscode.window.showWarningMessage('no workspace folder'); return; }
    await runCreate(sel, baseDir);
}

function previewFromSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showWarningMessage('no active editor'); return; }

    const sel = editor.document.getText(editor.selection);
    if (!sel.trim()) { vscode.window.showWarningMessage('select a tree first'); return; }

    const entries = parseTree(sel);
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

// ── reverse: folder → .tre ────────────────────────────────────────────

async function folderToTree(uri?: vscode.Uri) {
    if (!uri || !uri.fsPath) {
        vscode.window.showWarningMessage('right-click a folder in explorer');
        return;
    }
    let stat;
    try {
        stat = fs.statSync(uri.fsPath);
    } catch {
        vscode.window.showErrorMessage('could not read folder');
        return;
    }
    if (!stat.isDirectory()) {
        vscode.window.showWarningMessage("that's not a folder");
        return;
    }

    const treeText = generateTree(uri.fsPath);
    const doc = await vscode.workspace.openTextDocument({
        content: treeText,
        language: 'tre',
    });
    await vscode.window.showTextDocument(doc);
}

// simple 2-space format. matches read.tre output.
function generateTree(rootPath: string): string {
    const lines: string[] = [];
    walkDir(rootPath, 0, lines);
    return lines.join('\n') + '\n';
}

function walkDir(dir: string, depth: number, lines: string[]) {
    const indent = '  '.repeat(depth);
    lines.push(indent + path.basename(dir) + '/');

    let items: fs.Dirent[];
    try {
        items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }

    const filtered = items
        .filter(e => !IGNORE.has(e.name))
        .sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) {
                return a.isDirectory() ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

    for (const entry of filtered) {
        if (entry.isDirectory()) {
            walkDir(path.join(dir, entry.name), depth + 1, lines);
        } else {
            lines.push('  '.repeat(depth + 1) + entry.name);
        }
    }
}

// ── shared create logic ───────────────────────────────────────────────

async function runCreate(treeText: string, baseDir: string) {
    const entries = parseTree(treeText);
    if (entries.length === 0) {
        vscode.window.showWarningMessage('no entries parsed');
        return;
    }

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