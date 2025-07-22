# Supermarkdownland

**Supermarkdownland** is a VSCode extension that supercharges Markdown by adding support for **colon-based links** and custom navigation rules. It bridges the gap between structured project components and Markdown, making your documents interactive and context-aware.

---

## Features

- **Colon link syntax**  
  Use shorthand colon-based links (e.g., `[Parser](blocks:parser)`) that resolve to actual project files or components.

- **Custom colon rules**  
  Shortcuts for common patterns:
  - `[]` → `[:]`
  - `[.]` → `blocks:./:`
  - `[!]` → `blocks:!:`
  - `()` → `(:)`
  - `(.)` → `comps:./:`
  - `(!)` → `comps:!:`

- **Markdown Preview Integration**  
  Links are clickable both in the editor and the Markdown preview.

- **Relative or workspace-based resolution**  
  Links can resolve relative to the current file or to the workspace root.

- **Commands**  
  Clickable links in the editor trigger the `supermarkdownland.openColonLink` command to open target files.

---

## Example Usage

```markdown
# Example Links

- [Parser](blocks:parser)
- [Custom Component](comps:my-component)
- [Relative File](./relative/path/to/file.md)
````

When clicked or previewed:

* `blocks:parser` → `src/cavalion-blocks/parser.md`
* `comps:my-component` → `src/vcl-comps/my-component.md`
* Normal Markdown links remain unchanged.

---

## Installation

### Install from VSIX

1. Build the extension:

   ```bash
   vsce package
   ```
2. Install the `.vsix` file:

   ```bash
   code --install-extension supermarkdownland-0.0.1.vsix
   ```

Or open **VSCode > Extensions > ... > Install from VSIX...** and select the file.

---

## Extension Commands

| Command                           | Description                            |
| --------------------------------- | -------------------------------------- |
| `supermarkdownland.openColonLink` | Opens the target file of a colon link. |

---

## Development

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```
3. Press `F5` in VSCode to start an **Extension Development Host**.

To package the extension:

```bash
vsce package
```

---

## Known Issues

* Preview links might behave differently if the target file is outside the workspace.
* Colon links that don’t match defined rules are ignored.

---

## Release Notes

### 0.0.1

* Initial release with:

  * Colon link resolution.
  * Markdown preview integration.
  * Custom shorthand rules.

