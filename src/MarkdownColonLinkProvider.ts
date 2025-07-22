import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface ExtendedDocumentLink extends vscode.DocumentLink {
    command: { title: string; command: string; arguments: ExtendedDocumentLink[]; };
	description?: string;
	href?: string;
	documentUri?: vscode.Uri;
}

const BLOCKS_DEFAULT = 'src/cavalion-blocks';
const COMPS_DEFAULT = 'src/vcl-comps';
const ROOT_DEFAULT = 'src';

export class MarkdownColonLinkProvider implements vscode.DocumentLinkProvider {

	// --- Provide all document links ---
	public provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
		const links: vscode.DocumentLink[] = [];
		const regex = /\[([^\]]+)\]\(([^)\s]*)\)/g; // Slightly improved regex
		const text = document.getText();
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text))) {
			const description = match[1];
			const href = match[2];
			const start = document.positionAt(match.index);
			const end = document.positionAt(match.index + match[0].length);
			const range = new vscode.Range(start, end);

			const link = new vscode.DocumentLink(range) as ExtendedDocumentLink;
			link.description = description;
			link.href = href || '';
			link.documentUri = document.uri;

			const resolvedHref = this.resolveColonLink(href, description, document.uri, false);
			const tooltipFile = resolvedHref?.toString().split('/').pop() ?? '';

			link.tooltip = `Open: ${tooltipFile}`;
			link.target = undefined; // No direct URI, handled via command
			link.command = {
				title: 'Open colon link',
				command: 'supermarkdownland.openColonLink',
				arguments: [link]
			};

			links.push(link);
		}
		return links;
	}

	// --- Resolve a specific document link ---
	public resolveDocumentLink(link: vscode.DocumentLink): vscode.ProviderResult<vscode.DocumentLink> {
		const extended = link as ExtendedDocumentLink;
		const targetUri = this.resolveColonLink(extended.href ?? '', extended.description ?? '', extended.documentUri!, true) as vscode.Uri;

        if (targetUri) {
            extended.target = targetUri;
        }

        return extended;
	}

	// --- Handle click on a colon link ---
	public openColonLink(link: ExtendedDocumentLink): void {
		const targetUri = this.resolveColonLink(link.href ?? '', link.description ?? '', link.documentUri!, true);
		if (targetUri) {
			vscode.commands.executeCommand('vscode.open', targetUri);
		}
	}

	// --- Main colon link resolver ---
	public resolveColonLink1(linkText: string,description: string,fromResource: vscode.Uri,asUri: boolean = true): vscode.Uri | string | null {
		let target = linkText.trim();

		if (!target) {
			target = this.defaultTarget(description, fromResource);
			return asUri ? vscode.Uri.file(target) : target;
		}

		target = this.applyEncapsulationRules(target);
		target = this.replaceColonWithDescription(target, description);
		target = this.applyWorkspaceDefaults(target);

		const baseDir = this.getBaseDir(fromResource, target);
		const resolvedPath = path.normalize(path.join(baseDir, target));

		// Optional: check if file exists
		// if (!fs.existsSync(resolvedPath)) return null;

		return asUri ? vscode.Uri.file(resolvedPath) : resolvedPath;
	}

	// --- Main colon link resolver ---
	public resolveColonLink(
		linkText: string,
		description: string,
		fromResource: vscode.Uri,
		asUri: boolean = true,
		relativeToWorkspace: boolean = false
	): vscode.Uri | string | null {
		let target = linkText.trim();

		if (!target) {
			target = this.defaultTarget(description, fromResource);
			return asUri ? vscode.Uri.file(target) : this.formatRelative(target, fromResource, relativeToWorkspace);
		}

		target = this.applyEncapsulationRules(target);
		target = this.replaceColonWithDescription(target, description);
		target = this.applyWorkspaceDefaults(target);

		const baseDir = this.getBaseDir(fromResource, target);
		const resolvedPath = path.normalize(path.join(baseDir, target));

		// Optional: check if file exists
		// if (!fs.existsSync(resolvedPath)) return null;

		return asUri
			? vscode.Uri.file(resolvedPath)
			: this.formatRelative(resolvedPath, fromResource, relativeToWorkspace);
	}

	// --- Helper: default target when no href is present ---
	private defaultTarget(description: string, fromResource: vscode.Uri): string {
		let target = path.join(path.dirname(fromResource.fsPath), description);
		if (target.endsWith('/')) {target += '.md';}
		return target;
	}

	// --- Helper: apply encapsulation rules ---
	private applyEncapsulationRules(target: string): string {
		if (target === '[]') {return '[:]';}
		if (target === '[.]') {return 'blocks:./:';}
		if (target === '[!]') {return 'blocks:!:';}
		if (target.startsWith('[') && target.endsWith(']')) {return 'blocks:' + target.slice(1, -1);}

		if (target === '()') {return '(:)';}
		if (target === '(.)') {return 'comps:./:';}
		if (target === '(!)') {return 'comps:!:';}
		if (target.startsWith('(') && target.endsWith(')')) {return 'comps:' + target.slice(1, -1);}

		if (target === '{}') {return '{:}';}
		return target;
	}

	// --- Helper: replace colon placeholder with description ---
	private replaceColonWithDescription(target: string, description: string): string {
		const protocolMatch = target.match(/^[a-zA-Z]+:\/\//);
		const lastColonIndex = target.lastIndexOf(':');
		const hasProtocol = protocolMatch !== null;

		if ((!hasProtocol && lastColonIndex !== -1) ||
			(hasProtocol && lastColonIndex > (protocolMatch?.[0].length || 0))) {
			const prefix = target.substring(0, lastColonIndex);
			const suffix = target.substring(lastColonIndex + 1);
			target = `${prefix}${description}${suffix}`;
		}
		return target;
	}

	// --- Helper: apply workspace defaults ---
	private applyWorkspaceDefaults(target: string): string {
		const isProtocol = /^[a-zA-Z]+:\/\//.test(target);
		if (isProtocol) {return target;}

		if (target.startsWith('blocks:')) {
			target = target.substring('blocks:'.length);
			if (!target.startsWith('./') && !target.startsWith('/')) {target = `${BLOCKS_DEFAULT}/${target}`;}
		} else if (target.startsWith('comps:')) {
			target = target.substring('comps:'.length);
			if (!target.startsWith('./') && !target.startsWith('/')) {target = `${COMPS_DEFAULT}/${target}`;}
		} else {
			// Future root default
			// if (!target.startsWith('./') && !target.startsWith('/')) target = `${ROOT_DEFAULT}/${target}`;
		}

		if (target.endsWith('/')) {target += '.md';}
		return target;
	}

	// --- Helper: find base directory (workspace aware) ---
	private getBaseDir(fromResource: vscode.Uri, target: string): string {
		if (!target.startsWith('/')) {return path.dirname(fromResource.fsPath);}
		const folder = vscode.workspace.getWorkspaceFolder(fromResource);
		return folder?.uri.fsPath || path.dirname(fromResource.fsPath);
	}

	// --- Format relative path for display ---
	private formatRelative(absPath: string,fromResource: vscode.Uri,relativeToWorkspace: boolean): string {
		if (relativeToWorkspace) {
			const folder = vscode.workspace.getWorkspaceFolder(fromResource);
			if (folder && absPath.startsWith(folder.uri.fsPath)) {
				return path.relative(folder.uri.fsPath, absPath);
			}
		} else {
			const resourceDir = path.dirname(fromResource.fsPath);
			if (absPath.startsWith(resourceDir)) {
				return path.relative(resourceDir, absPath);
			}
		}
		return absPath; // fallback if nothing matches
	}

}
