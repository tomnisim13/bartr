type LogContext = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', context: LogContext, msg: string) {
  const payload = { level, msg, ...context, ts: new Date().toISOString() };
  if (level === 'error') {
    console.error(payload);
  } else if (level === 'warn') {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

export const logger = {
  info: (context: LogContext, msg: string) => emit('info', context, msg),
  warn: (context: LogContext, msg: string) => emit('warn', context, msg),
  error: (context: LogContext, msg: string) => emit('error', context, msg),
};
