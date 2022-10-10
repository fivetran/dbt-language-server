import { EOL } from 'node:os';
import { Event, EventEmitter, Pseudoterminal, TerminalDimensions } from 'vscode';

export class DbtInitTerminal implements Pseudoterminal {
  static readonly CONTROL_CODES = {
    ctrlC: '\u0003',
    enter: '\r',
    backspace: '\u007F',
    moveCursorBack: '\u001B[D',
    deleteCharacter: '\u001B[P',
  };

  private writeEmitter = new EventEmitter<string>();
  private dataSubmittedEventEmitter = new EventEmitter<string>();

  constructor(private startMessage: string) {}

  onDidWrite = this.writeEmitter.event;
  line = '';

  open(_initialDimensions: TerminalDimensions | undefined): void {
    this.writeRed(this.startMessage);
  }
  close(): void {
    this.dataSubmittedEventEmitter.fire(DbtInitTerminal.CONTROL_CODES.ctrlC);
  }
  handleInput(data: string): void {
    if (data === DbtInitTerminal.CONTROL_CODES.enter) {
      this.writeEmitter.fire('\r\n');
      this.dataSubmittedEventEmitter.fire(this.line);
      this.line = '';
      return;
    }
    if (data === DbtInitTerminal.CONTROL_CODES.backspace) {
      if (this.line.length === 0) {
        return;
      }
      this.line = this.line.slice(0, -1);
      this.writeEmitter.fire(DbtInitTerminal.CONTROL_CODES.moveCursorBack);
      this.writeEmitter.fire(DbtInitTerminal.CONTROL_CODES.deleteCharacter);
      return;
    }
    if (data.includes(DbtInitTerminal.CONTROL_CODES.ctrlC)) {
      this.dataSubmittedEventEmitter.fire(DbtInitTerminal.CONTROL_CODES.ctrlC);
    }
    if (data.includes(DbtInitTerminal.CONTROL_CODES.enter)) {
      const lines = data.split(DbtInitTerminal.CONTROL_CODES.enter);
      this.line = lines[lines.length - 1];
      this.writeEmitter.fire(data.replaceAll(DbtInitTerminal.CONTROL_CODES.enter, '\n\r'));
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
