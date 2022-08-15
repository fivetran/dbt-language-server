import { commands, Disposable } from 'vscode';

export interface Command {
  readonly id: string;

  execute(...args: unknown[]): void;
}

export class CommandManager {
  private readonly commands = new Map<string, Disposable>();

  dispose(): void {
    for (const registration of this.commands.values()) {
      registration.dispose();
    }
  }

  register<T extends Command>(command: T): T {
    if (!this.commands.has(command.id)) {
      this.commands.set(command.id, commands.registerCommand(command.id, command.execute.bind(command), command));
    }
    return command;
  }
}
