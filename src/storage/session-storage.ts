import { loadFromStorage, removeFromStorage, saveToStorage } from './storage';

/**
 * Last-session pointer for "Resume where you left off": the most recently
 * active project and perspective, mirrored to localStorage so the next app
 * launch (and the Home resume banner) can restore it.
 */

export type SessionPerspective = 'design' | 'simulate';

export interface LastSession {
    projectId: number;
    perspective: SessionPerspective;
}

const LAST_SESSION_KEY = 'lastSession';

/** The stored last session, or null when absent/malformed. */
export function getLastSession(): LastSession | null {
    const raw = loadFromStorage(LAST_SESSION_KEY);
    if (!raw || typeof raw !== 'object') return null;
    const session = raw as Partial<LastSession>;
    if (
        typeof session.projectId !== 'number' ||
        (session.perspective !== 'design' && session.perspective !== 'simulate')
    ) {
        return null;
    }
    return { projectId: session.projectId, perspective: session.perspective };
}

export function setLastSession(session: LastSession): void {
    saveToStorage(LAST_SESSION_KEY, session);
}

/** Clears the pointer (e.g. when its project has been deleted). */
export function clearLastSession(): void {
    removeFromStorage(LAST_SESSION_KEY);
}