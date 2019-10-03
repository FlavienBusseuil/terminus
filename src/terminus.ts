import { window, Terminal, StatusBarItem, StatusBarAlignment, commands } from "vscode";

import { matches } from "./matches";

export class Terminus {
	private currentLine: string = "";
	private countMatches: number[];
	private id: number = Math.random();
	private isLoading: boolean = false;
	private statusBarItem: StatusBarItem;
	private terminal: Terminal;
	private lastTerminalInput: Date = new Date();

	constructor(terminal: Terminal, statusBarPriority: number) {
		this.terminal = terminal;
		this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, statusBarPriority);
		this.countMatches = matches.map(() => 0);

		this.statusBarItem.show();

		const command = `showTerminal-${this.id}`;
		commands.registerCommand(command, () => {
			this.resetCount();
			this.terminal.show();
			this.updateDisplay();
		});
		this.statusBarItem.command = command;

		this.updateDisplay();

		window.onDidWriteTerminalData((event) => {
			const counts = this.parse(event.data);
			counts.forEach((count, i) => {
				this.countMatches[i] += count;
			});
			this.lastTerminalInput = new Date();
			this.isLoading = true;
			this.updateDisplay();
			setTimeout(() => {
				const nowMs = (new Date()).getTime();
				if (nowMs - this.lastTerminalInput.getTime() > 500) {
					this.isLoading = false;
					this.updateDisplay();
				}
			}, 500);
		});
	}

	public getStatusBarItem() {
		return this.statusBarItem;
	}

	public dispose() {
		this.statusBarItem.dispose();
	}

	private updateDisplay() {
		const icon = this.isLoading ? "$(clock)" : "$(terminal)";
		const name = `${this.terminal.name}`;
		const body = matches
			.map(({ display }, i) => ({ display, countMatch: this.countMatches[i] }))
			.filter(({ countMatch }) => countMatch > 0)
			.map(({ display, countMatch }) => `${display} ${countMatch}`)
			.join(" ");
		this.statusBarItem.text = [icon, name, body].filter((s) => s !== "").join(" ");
	}

	private parse(data: string): number[] {
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
				newCurrentLine = this.currentLine.slice(0, -1);
			} else {
				newCurrentLine = `${this.currentLine}${data}`;
			}
		}

		matches.forEach(({ expression }, i) => {
			const regExp = new RegExp(expression);
			if (
				lines.find((line) => line.search(regExp) !== -1) ||
				(this.currentLine.search(regExp) === -1 && newCurrentLine.search(regExp) !== -1)
			) {
				counts[i] += 1;
			}
		});

		this.currentLine = newCurrentLine;

		return counts;
	}

	private resetCount() {
		this.countMatches = matches.map(() => 0);
	}
}
