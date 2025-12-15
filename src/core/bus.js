const listeners = new Map();

export function on(type, handler) {
  if (!listeners.has(type)) listeners.set(type, []);
  listeners.get(type).push(handler);
}

export function emit(event) {
  const arr = listeners.get(event.type) || [];
  for (const fn of arr) fn(event);
}
