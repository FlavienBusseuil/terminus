"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
	commands,
	window,
	workspace,
	Terminal,
	ExtensionContext,
	StatusBarAlignment,
	StatusBarItem,
} from "vscode";

let currentLine = "";
let matches: Array<{ expression: string; display: string }>;
const terminuses: {
	[key: string]: {
		terminal: Terminal;
		statusBarItem: StatusBarItem;
		counts: number[];
		isLoading: boolean;
	};
} = {};

function initializeTerminus(terminal: Terminal, context: ExtensionContext) {
	terminal.processId.then((processId) => {
		const terminusId = processId.toString();
		const command = `showTerminal-${processId}`;
		const counts = matches.map(() => 0);
		// Existing terminus
		if (terminuses[terminusId]) {
			terminuses[terminusId].counts = counts;
			updateTerminusDisplay(terminusId);
			return;
		}

		const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 0);
		statusBarItem.command = command;
		terminuses[terminusId] = {
			counts,
			isLoading: false,
			statusBarItem,
			terminal,
		};
		context.subscriptions.push(statusBarItem);
		statusBarItem.show();
		commands.registerCommand(command, () => {
			terminuses[terminusId].counts.fill(0);
			terminal.show();
			updateTerminusDisplay(terminusId);
		});
		updateTerminusDisplay(terminusId);
		watchTerminus(terminusId);
	});
}

function releaseTerminus(terminal: Terminal) {
	terminal.processId.then((processId) => {
		const { statusBarItem } = terminuses[processId];
		statusBarItem.dispose();
		delete terminuses[processId];
	});
}

function parse(data: string): number[] {
	let newCurrentLine = "";
	const counts = matches.map(() => 0);
	if (!data || !data.length) {
		return counts;
	}

	const lines = data.split("\n");
	if (lines.length > 1) {
		newCurrentLine = lines.pop() || "";
	} else {
		if (data.indexOf("\b") === 0) {
			newCurrentLine = currentLine.slice(0, -1);
		} else {
			newCurrentLine = `${currentLine}${data}`;
		}
	}

	matches.forEach(({ expression }, i) => {
		const regExp = new RegExp(expression);
		if (
			lines.find((line) => line.search(regExp) !== -1) ||
			(currentLine.search(regExp) === -1 && newCurrentLine.search(regExp) !== -1)
		) {
			counts[i] += 1;
		}
	});

	currentLine = newCurrentLine;

	return counts;
}

function updateTerminusDisplay(terminusId: string) {
	const { counts, isLoading, terminal, statusBarItem } = terminuses[terminusId];
	const prefix = `${terminal.name}:`;
	const body = matches.map(({ display }, i) => `${display} ${counts[i]}`).join("  ");
	const suffix = isLoading ? "⏳" : "";
	statusBarItem.text = `${prefix} ${body} ${suffix}`;
}

function watchTerminus(terminusId: string) {
	const terminus = terminuses[terminusId];
	const { terminal } = terminus;
	terminal.onDidWriteData((data: string) => {
		const counts = parse(data);
		counts.forEach((count, i) => {
			terminus.counts[i] += count;
		});
		if (!terminus.isLoading) {
			terminus.isLoading = true;
			updateTerminusDisplay(terminusId);
			setTimeout(() => {
				terminus.isLoading = false;
				updateTerminusDisplay(terminusId);
			}, 500);
		}
	});
}

function setMatches() {
	matches =
		workspace
			.getConfiguration("terminus")
			.get<Array<{ expression: string; display: string }>>("matches") || [];
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
	setMatches();
	window.terminals.forEach((terminal) => initializeTerminus(terminal, context));
	window.onDidOpenTerminal((terminal) => initializeTerminus(terminal, context));
	window.onDidCloseTerminal((terminal) => releaseTerminus(terminal));
	workspace.onDidChangeConfiguration(() => {
		setMatches();
		window.terminals.forEach((terminal) => initializeTerminus(terminal, context));
	});
}

// this method is called when your extension is deactivated
export function deactivate() {
	window.terminals.forEach((terminal) => releaseTerminus(terminal));
}
