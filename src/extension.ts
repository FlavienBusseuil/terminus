"use strict";

import { window, workspace, Terminal, ExtensionContext } from "vscode";

import { Terminus } from "./terminus";
import { matches } from "./matches";

let EXTENTION_CONTEXT: ExtensionContext;
const terminuses: Map<Terminal, Terminus> = new Map();

function initializeTerminusFromTerminal(terminal: Terminal) {
	// ytho?
	if (terminuses.has(terminal)) {
		releaseTerminusFromTerminal(terminal);
	}

	const terminusPriority = -terminuses.size - 1;
	const terminus = new Terminus(terminal, terminusPriority);
	terminuses.set(terminal, terminus);
	EXTENTION_CONTEXT.subscriptions.push(terminus.getStatusBarItem());
}

function releaseTerminusFromTerminal(terminal: Terminal) {
	const terminus = terminuses.get(terminal);
	if (terminus) {
		terminus.dispose();
	}
	terminuses.delete(terminal);
}

function initializeMatches() {
	matches.splice(0, matches.length);
	matches.push(
		...(workspace
			.getConfiguration("terminus")
			.get<Array<{ expression: string; display: string }>>("matches") || []),
	);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
	EXTENTION_CONTEXT = context;
	initializeMatches();
	window.terminals.forEach((terminal) => initializeTerminusFromTerminal(terminal));
	window.onDidOpenTerminal((terminal) => initializeTerminusFromTerminal(terminal));
	window.onDidCloseTerminal((terminal) => releaseTerminusFromTerminal(terminal));
	workspace.onDidChangeConfiguration(() => {
		initializeMatches();
		window.terminals.forEach((terminal) => {
			releaseTerminusFromTerminal(terminal);
			initializeTerminusFromTerminal(terminal);
		});
	});
}

// this method is called when your extension is deactivated
export function deactivate() {
	window.terminals.forEach((terminal) => releaseTerminusFromTerminal(terminal));
}
