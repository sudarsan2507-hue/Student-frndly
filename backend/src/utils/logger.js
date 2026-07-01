const isDev = process.env.NODE_ENV !== 'production';

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = isDev ? levels.debug : levels.info;

const fmt = (level, msg, meta) => {
    const ts = new Date().toISOString();
    const base = `[${ts}] [${level.toUpperCase()}] ${msg}`;
    if (meta && Object.keys(meta).length > 0) {
        return `${base} ${JSON.stringify(meta)}`;
    }
    return base;
};

const logger = {
    error(msg, meta = {}) {
        if (currentLevel >= levels.error) process.stderr.write(fmt('error', msg, meta) + '\n');
    },
    warn(msg, meta = {}) {
        if (currentLevel >= levels.warn) process.stderr.write(fmt('warn', msg, meta) + '\n');
    },
    info(msg, meta = {}) {
        if (currentLevel >= levels.info) process.stdout.write(fmt('info', msg, meta) + '\n');
    },
    debug(msg, meta = {}) {
        if (currentLevel >= levels.debug) process.stdout.write(fmt('debug', msg, meta) + '\n');
    }
};

export default logger;
