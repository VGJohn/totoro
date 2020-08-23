const router = require('express').Router();
const consts = require('./consts.js');
const Endpoint = require('./objects/Endpoint.js');

var logger;

const defaultMiddleware = (res, req, next) => next();

const clearConsoleAndScrollbackBuffer = () => {
  process.stdout.write('\u001b[3J\u001b[2J\u001b[1J');
  console.clear();
};

const createLogger = () => {
  const winston = require('winston');
  const logFormat = winston.format.printf(function (info) {
    if (info.message === '\n') {
      return info.message;
    }
    return `[totoro] [${info.level}]    ${info.message}`;
  });
  return winston.createLogger({
    level: consts.LOG_LEVEL,
    format: winston.format.combine(winston.format.colorize(), logFormat),
    transports: [
      new winston.transports.Console(),
      // new winston.transports.File({ filename: 'logfile.log' }),
    ],
  });
};

const rain = (apiConfig, loggerInstance = undefined, clearConsole = false) => {
  // maybe use TS next time?
  try {
    logger =
      loggerInstance && typeof loggerInstance['log'] === 'function' ? loggerInstance : createLogger();
  } catch (err) {
    // idk when this will be called. maybe at nuclear apocalypse when winston stops working
    logger = console;
    logger.log(err);
  }

  clearConsole && clearConsoleAndScrollbackBuffer();

  const versions = {};
  let previousApiVersion = null;

  for (let apiVersion in apiConfig) {
    if (apiConfig.hasOwnProperty(apiVersion)) {
      let apiVersionConfig = apiConfig[apiVersion];

      let apiVersionActive = apiVersionConfig.active;
      // use default value if not found
      if (apiVersionActive == null) apiVersionActive = true;

      let apiVersionDeprecated = apiVersionConfig.deprecated;
      // use default value if not found
      if (apiVersionDeprecated == null) apiVersionDeprecated = false;

      delete apiVersionConfig.active;
      delete apiVersionConfig.deprecated;
      versions[apiVersion] = [];

      // copy over endpoints from previous version if needed
      inheritEndpoints(versions, previousApiVersion, apiVersion);

      // set previous api version number
      previousApiVersion = apiVersion;

      for (let i = 0; i < apiVersionConfig.endpoints.length; i++) {
        let endpointActive = apiVersionConfig.endpoints[i].active;
        // use default value if not found
        if (endpointActive == null) endpointActive = true;

        let endpointDeprecated = apiVersionConfig.endpoints[i].deprecated;
        // use default value if not found
        if (endpointDeprecated == null) endpointDeprecated = false;

        apiVersionConfig.endpoints[i].active = endpointActive && apiVersionActive;
        apiVersionConfig.endpoints[i].deprecated = endpointDeprecated || apiVersionDeprecated;
        let endpoint = new Endpoint(apiVersion, apiVersionConfig.endpoints[i]);
        endpoint.config.middleware = [...[defaultMiddleware], ...(endpoint.config.middleware || [])];
        // add new endpoint to the list or replace if it exists already
        pushOrReplaceRoute(versions[apiVersion], endpoint);
      }
    }
  }

  return populateRouter(versions);
};

function inheritEndpoints(versions, previousApiVersion, apiVersion) {
  if (previousApiVersion == null) {
    return;
  }

  for (let i = 0; i < versions[previousApiVersion].length; i++) {
    if (!versions[previousApiVersion][i].config.deprecated) {
      let endpointCopy = { ...versions[previousApiVersion][i] };
      endpointCopy.apiVersion = apiVersion;
      endpointCopy.config.active = true;
      versions[apiVersion].push(endpointCopy);
    }
  }
}

function pushOrReplaceRoute(endpoints, endpoint) {
  let replaced = false;
  for (let i = 0; i < endpoints.length; i++) {
    if (
      endpoints[i].config.route == endpoint.config.route &&
      endpoints[i].config.method == endpoint.config.method
    ) {
      endpoints[i] = endpoint;
      replaced = true;
    }
  }

  if (!replaced) {
    endpoints.push(endpoint);
  }
}

function populateRouter(versions) {
  for (let apiVersion in versions) {
    if (versions.hasOwnProperty(apiVersion)) {
      logger.log('debug', `API version ${apiVersion}`);
      for (let i = 0; i < versions[apiVersion].length; i++) {
        if (versions[apiVersion][i].config.active) {
          constructRoute(versions[apiVersion][i]);
        }
      }
      logger.log('debug', '\n');
      // logger.log('debug', `End of API version ${apiVersion}\n`);
    }
  }

  return router;
}

function constructRoute(endpoint) {
  const endpointURL = `/${endpoint.apiVersion}${endpoint.config.route}`;

  if (!consts.HTTP_METHODS.includes(endpoint.config.method)) {
    logger.log('error', `HTTP Method not recognised! '${endpoint.config.method} ${endpointURL}'`);
    return;
  }
  logger.log('debug', `[Endpoint]    :    '${endpoint.config.method} ${endpointURL}'`);
  router[endpoint.config.method.toLowerCase()](
    endpointURL,
    endpoint.config.middleware,
    async (req, res, next) => {
      return await endpoint.config.implementation(endpoint.apiVersion, req, res, next);
    }
  );
}

module.exports = {
  rain: rain,
};
