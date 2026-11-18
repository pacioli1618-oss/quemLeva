// Both values are inlined at build time by the `env` block in next.config.ts.

/** "version" from package.json, e.g. "0.1.0". */
export const appVersion = process.env.APP_VERSION ?? '';

/** Short commit of the deployed build, e.g. "a1b2c3d". Empty outside Vercel. */
export const appCommit = process.env.APP_COMMIT ?? '';
