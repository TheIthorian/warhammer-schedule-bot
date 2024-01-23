import { PartialUser, User } from 'discord.js';
import { config } from '../config';
import { makeLogger } from '../util/logger';

const log = makeLogger(module);

export function isUserAdmin(user: User | PartialUser) {
    const userId = user.id;
    log.info({ adminUsers: config.adminUsers, userId });
    return config.adminUsers.includes(userId);
}
