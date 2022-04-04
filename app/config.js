const DEFAULT_ENDPOINT = '/pusher/auth';
// const {APP_ID, APP_KEY, APP_SECRET, CLUSTER, CHANNELS_HOST, CHANNELS_PORT, PORT, DEBUG, ENCRYPTION_MASTER_KEY} = process.env;
const ENDPOINT = process.env.ENDPOINT || DEFAULT_ENDPOINT;
const config = Object.assign({}, process.env, {ENDPOINT});

const requiredKeys = ['APP_ID', 'APP_KEY', 'APP_SECRET'];

requiredKeys.forEach(key => {
    if (config[key]) return;
    throw new Error(getMissingKeyErrorString(key));
});

module.exports = config;

function getMissingKeyErrorString(keyName) {
    return `Unable to find environment variable: ${keyName}! \n` +
        `Did you remember to set the ${keyName} value in your .env file?`;
}
