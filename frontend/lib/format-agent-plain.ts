/** Show agent replies as readable plain text (strip common markdown noise). */
export function formatAgentReplyAsPlainText(raw: string): string {
  if (!raw.trim()) return raw;
  let s = raw.replace(/\r\n/g, "\n");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/^([-*+])\s+/gm, "• ");
  return s.trimEnd();
}
