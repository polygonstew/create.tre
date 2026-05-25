import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseTreeToStructure, extractTreeLines } from './parser';

export function activate(context: vscode.ExtensionContext) {
    // Command: generate .tre from a folder
    let folderToTree = vscode.commands.registerCommand('create.tre.folderToTree', async (uri?: vscode.Uri) => {
        let targetFolder: string | undefined;
        if (uri && uri.fsPath) {
            const stat = fs.statSync(uri.fsPath);
            if (stat.isDirectory()) targetFolder = uri.fsPath;
            else targetFolder = path.dirname(uri.fsPath);
        } else {
            const folders = vscode.workspace.workspaceFolders;
            if (folders && folders.length > 0) targetFolder = folders[0].uri.fsPath;
            else targetFolder = undefined;
        }
        if (!targetFolder) {
            vscode.window.showErrorMessage('No folder selected.');
            return;
        }
        const outputTree = walkDirectory(targetFolder);
        const outputFileName = path.basename(targetFolder) + '.tre';
        const outputPath = path.join(targetFolder, outputFileName);
        fs.writeFileSync(outputPath, outputTree, 'utf8');
        vscode.window.showInformationMessage(`Created ${outputFileName}`);
        const doc = await vscode.workspace.openTextDocument(outputPath);
        await vscode.window.showTextDocument(doc);
    });

    // Command: create folders/files from a .tre file (selected in explorer)
    let createFromFile = vscode.commands.registerCommand('create.tre.createFromFile', async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('No file selected.');
            return;
        }
        const filePath = uri.fsPath;
        if (!filePath.endsWith('.tre')) {
            vscode.window.showWarningMessage('Selected file is not a .tre file.');
            return;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const treeLines = extractTreeLines(content);
        if (treeLines.length === 0) {
            vscode.window.showErrorMessage('No valid tree structure found in the file.');
            return;
        }
        const rootName = path.basename(filePath, '.tre');
        const targetDir = path.dirname(filePath);
        const basePath = path.join(targetDir, rootName);
        try {
            parseTreeToStructure(treeLines, basePath);
            vscode.window.showInformationMessage(`Materialized structure to ${basePath}`);
            vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(basePath));
        } catch (err: any) {
            vscode.window.showErrorMessage(`Error: ${err.message}`);
        }
    });

    // Command: create from currently selected text in an editor
    let createFromSelection = vscode.commands.registerCommand('create.tre.createFromSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor.');
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text.trim()) {
            vscode.window.showErrorMessage('No text selected.');
            return;
        }
        const treeLines = extractTreeLines(text);
        if (treeLines.length === 0) {
            vscode.window.showErrorMessage('No valid tree structure found in selection.');
            return;
        }
        let rootName = 'materialized';
        // If the current document is a .tre file, use its name (without extension)
        if (editor.document.fileName.endsWith('.tre')) {
            rootName = path.basename(editor.document.fileName, '.tre');
        }
        const basePath = path.join(path.dirname(editor.document.fileName), rootName);
        try {
            parseTreeToStructure(treeLines, basePath);
            vscode.window.showInformationMessage(`Materialized structure to ${basePath}`);
            vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(basePath));
        } catch (err: any) {
            vscode.window.showErrorMessage(`Error: ${err.message}`);
        }
    });

    context.subscriptions.push(folderToTree, createFromFile, createFromSelection);
}

export function deactivate() {}

function walkDirectory(dir: string, indent: string = ''): string {
    let result = '';
    const entries = fs.readdirSync(dir);
    const sorted = entries.sort((a, b) => {
        const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
        const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
    });
    for (let i = 0; i < sorted.length; i++) {
        const name = sorted[i];
        const fullPath = path.join(dir, name);
        const isDir = fs.statSync(fullPath).isDirectory();
        const isLast = i === sorted.length - 1;
        const prefix = indent + (isLast ? '  ' : '  ');
        result += prefix + name;
        if (isDir) result += '/';
        result += '\n';
        if (isDir) {
            const newIndent = indent + (isLast ? '  ' : '  ');
            result += walkDirectory(fullPath, newIndent);
        }
    }
    return result;
}