export function redactText(input: string): string {
  if (!input) return input;
  return input
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED:EMAIL]')
    .replace(/\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b/g, '[REDACTED:PHONE]');
}

export function redactObject<T>(obj: T): T {
  try {
    const str = JSON.stringify(obj);
    const red = redactText(str);
    return JSON.parse(red);
  } catch {
    return obj;
  }
}

