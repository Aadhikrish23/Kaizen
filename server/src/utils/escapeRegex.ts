/** Escape user input so it matches literally inside a MongoDB $regex (prevents regex/NoSQL operator injection). */
export const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
