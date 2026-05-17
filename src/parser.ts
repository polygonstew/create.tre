// turn tree text into a flat list of paths + dir/file flags.
// handles three input formats:
//   1. simple 2-space indent (what read.tre and our generateTree produce)
//   2. markdown box-drawing (├── └── with 2 dashes, common in README files)
//   3. windows 'tree /F' output (with PATH listing header, ascii or unicode)

export type Entry = {
    path: string;
    isDirectory: boolean;
};

const TREE_CHARS = new Set(['│', '├', '└', '─', '+', '|', '\\', '-', ' ']);

export function parseTree(input: string): Entry[] {
    let lines = input.replace(/\t/g, '    ').split('\n');

    const isTreeFOutput = lines.some(l =>
        l.includes('PATH listing for volume') ||
        l.startsWith('Volume serial number'));

    const hasBoxDrawing = lines.some(l =>
        l.includes('├') || l.includes('└') || l.includes('│') ||
        l.includes('+---') || l.includes('\\---'));

    if (isTreeFOutput) {
        lines = normalizeTreeFOutput(lines);
    } else if (hasBoxDrawing) {
        lines = normalizeBoxDrawing(lines);
    }

    return parseSimple(lines);
}

// tree /F output -> simple format. drops C:. root, uses markers to find folders.
function normalizeTreeFOutput(lines: string[]): string[] {
    const result: string[] = [];

    for (const rawLine of lines) {
        const stripped = rawLine.trimEnd();
        if (stripped === '') continue;
        if (stripped.includes('PATH listing')) continue;
        if (stripped.startsWith('Volume serial number')) continue;
        if (stripped.endsWith(':.')) continue;

        let nameStart = 0;
        while (nameStart < stripped.length && TREE_CHARS.has(stripped[nameStart])) {
            nameStart++;
        }
        const name = stripped.slice(nameStart).trim();
        if (!name) continue;

        // tree /F skips C:. root, so col 4 is actually depth 0
        const naturalDepth = Math.floor(nameStart / 4);
        if (naturalDepth < 1) continue;
        const depth = naturalDepth - 1;

        // folder marker at (naturalDepth-1)*4
        let isFolder = name.endsWith('/');
        if (!isFolder) {
            const markerPos = (naturalDepth - 1) * 4;
            if (markerPos < stripped.length) {
                const m = stripped[markerPos];
                if (m === '├' || m === '└' || m === '+' || m === '\\') {
                    isFolder = true;
                }
            }
        }

        const cleanName = name.endsWith('/') ? name.slice(0, -1) : name;
        result.push('  '.repeat(depth) + cleanName + (isFolder ? '/' : ''));
    }

    return result;
}

// markdown box-drawing -> simple format. trailing / is the only folder signal.
function normalizeBoxDrawing(lines: string[]): string[] {
    const result: string[] = [];

    for (const rawLine of lines) {
        const stripped = rawLine.trimEnd();
        if (stripped === '') continue;

        let nameStart = 0;
        while (nameStart < stripped.length && TREE_CHARS.has(stripped[nameStart])) {
            nameStart++;
        }
        const name = stripped.slice(nameStart).trim();
        if (!name) continue;

        const depth = Math.floor(nameStart / 4);
        const isFolder = name.endsWith('/');
        const cleanName = isFolder ? name.slice(0, -1) : name;

        result.push('  '.repeat(depth) + cleanName + (isFolder ? '/' : ''));
    }

    return result;
}

// the actual parser. 2-space indent, trailing / for folders.
function parseSimple(lines: string[]): Entry[] {
    const entries: Entry[] = [];
    const stack: string[] = [];

    for (const rawLine of lines) {
        const hashIdx = rawLine.indexOf('#');
        const stripped = (hashIdx === -1 ? rawLine : rawLine.slice(0, hashIdx)).trimEnd();
        if (stripped.trim() === '') continue;

        let spaces = 0;
        while (spaces < stripped.length && stripped[spaces] === ' ') spaces++;
        const depth = Math.floor(spaces / 2);

        const name = stripped.slice(spaces).trim();
        if (!name) continue;

        const isDir = name.endsWith('/');
        const cleanName = isDir ? name.slice(0, -1) : name;

        stack.length = depth;
        stack.push(cleanName);

        // promote previous to dir if children appear under it
        if (entries.length > 0) {
            const prev = entries[entries.length - 1];
            const prevDepth = prev.path.split('/').length - 1;
            if (depth > prevDepth && !prev.isDirectory) {
                prev.isDirectory = true;
            }
        }

        entries.push({
            path: stack.join('/'),
            isDirectory: isDir,
        });
    }

    return entries;
}