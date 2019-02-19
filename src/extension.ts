"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
	window,
	commands,
	Terminal,
	ExtensionContext,
	StatusBarAlignment,
	StatusBarItem,
} from "vscode";

let currentLine = "";
const terminuses: {
	[key: string]: {
		terminal: Terminal;
		statusBarItem: StatusBarItem;
		counts: number[];
		isLoading: boolean;
	};
} = {};
const matches = [
	{
		display: "⚠️",
		expression: /[Ww]arning/,
	},
	{
		display: "❌",
		expression: /[Ee]rror/,
	},
];

function initializeTerminus(terminal: Terminal, context: ExtensionContext) {
	const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 0);
	terminal.processId.then((processId) => {
		commands.registerCommand(`showTerminal-${processId}`, () => terminal.show());
		statusBarItem.command = `showTerminal-${processId}`;
		const terminusId = processId.toString();
		terminuses[terminusId] = {
			counts: matches.map(() => 0),
			isLoading: false,
			statusBarItem,
			terminal,
		};
		context.subscriptions.push(statusBarItem);
		statusBarItem.show();
		displayTerminus(terminusId);
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
	const counts = matches.map(({ expression }) => 0);
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
		if (
			lines.find((line) => line.search(expression) !== -1) ||
			(currentLine.search(expression) === -1 && newCurrentLine.search(expression) !== -1)
		) {
			counts[i] += 1;
		}
	});

	currentLine = newCurrentLine;

	return counts;
}

function displayTerminus(terminusId: string) {
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
			displayTerminus(terminusId);
			setTimeout(() => {
				terminus.isLoading = false;
				displayTerminus(terminusId);
			}, 500);
		}
	});
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
	window.terminals.forEach((terminal) => initializeTerminus(terminal, context));
	window.onDidOpenTerminal((terminal) => initializeTerminus(terminal, context));
	window.onDidCloseTerminal((terminal) => releaseTerminus(terminal));
}

// this method is called when your extension is deactivated
export function deactivate() {
	window.terminals.forEach((terminal) => releaseTerminus(terminal));
}
