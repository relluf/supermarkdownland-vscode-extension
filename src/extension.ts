import * as vscode from 'vscode';
import { MarkdownColonLinkProvider } from './MarkdownColonLinkProvider';
import path from 'path';

let provider: MarkdownColonLinkProvider;

export function activate(context: vscode.ExtensionContext) {
	provider = new MarkdownColonLinkProvider();

	context.subscriptions.push(
		vscode.languages.registerDocumentLinkProvider(
			{ language: 'markdown', scheme: 'file' },
			provider
		)
	);

	return {
		extendMarkdownIt(md: any) {
			return md.use(colonLinkPlugin, { provider });
		}
	};
}

export function deactivate() {
	console.log('[supermarkdownland] MarkdownColonLinkProvider deactivated');
}

function colonLinkPlugin(md: any, options: { provider: MarkdownColonLinkProvider }) {
	const defaultRender =
		md.renderer.rules.link_open ||
		function (tokens: any, idx: any, opts: any, env: any, self: any) {
			return self.renderToken(tokens, idx, opts);
		};

	md.core.ruler.after('inline', 'colon-links', (state: any) => {
		const docUri =
			state.env?.documentUri ||
			vscode.window?.activeTextEditor?.document?.uri;

		if (!docUri) {
			console.warn('[supermarkdownland] No document URI available for colon link resolution.');
			return;
		}

		modifyLinkTokens(state.tokens, docUri);
	});

	/**
	 * Recursively modifies link tokens, resolving colon links via the provider.
	 */
	function modifyLinkTokens(tokens: any[], docUri: vscode.Uri) {
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.type === 'link_open') {
				const hrefIndex = token.attrIndex('href');
				if (hrefIndex >= 0) {
					const originalHref = token.attrs[hrefIndex][1];

					// Extract description (usually in the next token)
					const description = tokens[i + 1]?.type === 'text'
						? tokens[i + 1].content
						: '';

                    const resolvedHref = provider.resolveColonLink(originalHref, description, docUri, false, true);
                    token.attrSet('href', "/" + resolvedHref);
				}
			}

			// Recurse into children tokens
			if (token.children && token.children.length > 0) {
				modifyLinkTokens(token.children, docUri);
			}
		}
	}

	md.renderer.rules.link_open = (
		tokens: any,
		idx: any,
		opts_: any,
		env: any,
		self: any
	) => {
		const token = tokens[idx];
		const hrefAttr = token.attrGet('href');

		if (hrefAttr && hrefAttr.startsWith(':')) {
			const resolved = options.provider.resolveColonLink(
				hrefAttr,
				token.content,
				env.documentUri || vscode.window?.activeTextEditor?.document?.uri,
				false
			);
			token.attrSet('href', resolved);
		}

		return defaultRender(tokens, idx, opts_, env, self);
	};
}
