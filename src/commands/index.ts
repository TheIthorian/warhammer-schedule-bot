import { InteractionHandler } from './handler';
import { PingCommand } from './ping';
import { Command } from './types';

export const commands: Array<Command> = [new PingCommand()];
export const interactionHandler = new InteractionHandler(commands);
