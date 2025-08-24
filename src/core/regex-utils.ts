export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const buildUaRegex = (list: Iterable<string>): RegExp => {
  const parts = Array.from(list).map(escapeRegex);
  return parts.length ? new RegExp(`(?:${parts.join('|')})`, 'i') : /$a/;
};
