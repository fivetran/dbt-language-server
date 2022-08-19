import { EOL } from 'os';
import { outputChannelProvider } from './extension';

export function log(message: string): void {
  outputChannelProvider.getMainLogChannel().append(`Client ${new Date().toISOString()}: ${message}${EOL}`);
}
