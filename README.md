<div align="center">

```
  ┌─ create.tre
  └─ .tre -> folders
```

![typescript](https://img.shields.io/badge/typescript-5.4-D97706?style=flat-square)
![vscode](https://img.shields.io/badge/vscode-1.80%2B-1F2937?style=flat-square)
![status](https://img.shields.io/badge/status-pre--release-1F2937?style=flat-square)

</div>

---

vscode extension. write a tree like this:

```
demo/
  readme.md
  src/
    main.py
    utils/
      helper.py
  tests/
    test_main.py
```

right-click → those folders and files exist on disk. empty.

works on `.tre` files in the explorer, or on selected text in any file (handy for trees inside markdown and design docs).

companion to [read.tre](https://github.com/polygonstew/read.tre), the CLI that scaffolds the same format from a terminal and also goes the other direction (folder → `.tre`).

## why

writing trees in readmes and design docs and then manually `mkdir`/ touching every line is tedious. one right-click should fix that.

## install

not on the marketplace yet. clone and run from source:

```
git clone https://github.com/polygonstew/create.tre
cd create.tre
npm install
npm run compile
```

then either:

- press `F5` inside VS Code with the project open — launches an Extension Development Host with create.tre loaded
- or `vsce package` and `code --install-extension create-tre-0.0.1.vsix` to install it for real

## commands

| command                                | invoke from                            | what it does                                          |
|----------------------------------------|----------------------------------------|-------------------------------------------------------|
| `create.tre: Create From File`         | right-click a `.tre` file in explorer  | materializes the tree from that file                  |
| `create.tre: Create From Selection`    | right-click a text selection           | materializes the tree from the selected text          |
| `create.tre: Preview From Selection`   | right-click a text selection           | shows what would be created, writes nothing           |

## format

2-space indent. folders end with `/`. files don't. blank lines fine. `#` starts a comment and is stripped.

```
demo/
  readme.md          # this is a comment
  src/
    main.py
    utils/
      helper.py
  tests/
    test_main.py
```

also parses tree-drawing characters, so this works:

```
demo/
├── readme.md
├── src/
│   ├── main.py
│   └── utils/
│       └── helper.py
└── tests/
    └── test_main.py
```

and Windows `tree /F /A` output — paste it into a selection and scaffold.

## companion

[read.tre](https://github.com/polygonstew/read.tre) is the CLI for the same `.tre` format. install via winget:

```
winget install polygonstew.read.tre
```

use create.tre when you're in the editor. use read.tre when you're in a terminal, or when you want to capture an existing folder as a `.tre`.
search vscode extensions for "create.tre"
