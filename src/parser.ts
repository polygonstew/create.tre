// turn tree-formatted text into a flat list of paths + dir/file flags.
// no fs, no vscode api — string in, structured data out.

export type Entry = {
    path: string;
    isDirectory: boolean;
};

// chars to skip when finding where the actual name starts on a line
const TREE_CHARS = new Set(['│', '├', '└', '─', ' ', '\t']);

export function parseTree(input: string): Entry[] {
    const entries: Entry[] = [];
    const stack: string[] = [];

    // normalize tabs to 4 spaces so depth math works the same either way
    const lines = input.replace(/\t/g, '    ').split('\n');

    for (const rawLine of lines) {
        // strip comments — everything after first '#'
        const hashIdx = rawLine.indexOf('#');
        const stripped = (hashIdx === -1 ? rawLine : rawLine.slice(0, hashIdx)).trimEnd();

        if (stripped.trim() === '') continue;

        // skip leading tree-drawing chars and whitespace to find the name
        let nameStart = 0;
        while (nameStart < stripped.length && TREE_CHARS.has(stripped[nameStart])) {
            nameStart++;
        }

        const name = stripped.slice(nameStart).trim();
        if (!name) continue;

        // every level of nesting is 4 chars wide in standard tree output
        const depth = Math.floor(nameStart / 4);
        const isDir = name.endsWith('/');
        const cleanName = isDir ? name.slice(0, -1) : name;

        // shrink stack to current depth, then add this entry
        stack.length = depth;
        stack.push(cleanName);

        // if the previous entry was at a shallower depth and wasn't already a dir,
        // promote it. catches "foo" with children when it should've been "foo/".
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