// Tiny nanoid-like ID generator (no extra dependency needed)
export function nanoid(size = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: size }, () => chars[Math.floor(Math.random() * chars.length)]).join(
    "",
  );
}
