// Escapes a user's text for a SQL LIKE pattern, so % and _ match themselves
// rather than acting as wildcards (the default escape character is \).
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');
