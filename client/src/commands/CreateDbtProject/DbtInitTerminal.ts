import { EOL } from 'node:os';
import { Event, EventEmitter, Pseudoterminal, TerminalDimensions } from 'vscode';

export class DbtInitTerminal implements Pseudoterminal {
  private writeEmitter = new EventEmitter<string>();
  private dataSubmittedEventEmitter = new EventEmitter<string>();

  constructor(private startMessage: string) {}

  onDidWrite = this.writeEmitter.event;
  line = '';

  open(_initialDimensions: TerminalDimensions | undefined): void {
    this.writeRed(this.startMessage);
  }
  close(): void {
    console.log('close');
  }
  handleInput(data: string): void {
    // Enter
    if (data === '\r') {
      this.writeEmitter.fire('\r\n');
      this.dataSubmittedEventEmitter.fire(this.line);
      this.line = '';
      return;
    }
    // Backspace
    if (data === '\u007F') {
      if (this.line.length === 0) {
        return;
      }
      this.line = this.line.slice(0, -1);
      // Move cursor backward
      this.writeEmitter.fire('\u001B[D');
      // Delete character
      this.writeEmitter.fire('\u001B[P');
      return;
    }
    if (data.includes('\r')) {
      const lines = data.split('\r');
      this.line = lines[lines.length - 1];
      this.writeEmitter.fire(data.replaceAll('\r', '\n\r'));
    } else {
      this.line += data;
      this.writeEmitter.fire(data);
    }
  }

  write(data: string): void {
    this.writeEmitter.fire(data.replaceAll(EOL, '\n\r'));
  }

  writeRed(data: string): void {
    this.write(`\u001B[31m${data}\u001B[0m`);
  }

  get onDataSubmitted(): Event<string> {
    return this.dataSubmittedEventEmitter.event;
  }
}
