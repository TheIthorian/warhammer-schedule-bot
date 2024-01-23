import { PartialUser, User } from 'discord.js';
import { config } from '../config';

export function isUserAdmin(user: User | PartialUser) {
    const userId = user.id;
    return config.adminUsers.includes(userId);
}
