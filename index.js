var express = require('express');
var router = express.Router();
var winston = require('winston');
var consts = require('./consts.js');
var Endpoint = require('./objects/Endpoint.js');
var clone = require('clone');
var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({ extended: false })

winston.level = consts.LOG_LEVEL;

var rain = function(apiConfig, winstonLogger) {
    enableLogging(winstonLogger);

    var versions = {};
    var previousApiVersion = null;

    for (var apiVersion in apiConfig) {
        if (apiConfig.hasOwnProperty(apiVersion)) {
            var apiVersionConfig = apiConfig[apiVersion];

            var apiVersionActive = apiVersionConfig.active;
            // use default value if not found
            if (apiVersionActive == null) apiVersionActive = true;

            var apiVersionDeprecated = apiVersionConfig.deprecated;
            // use default value if not found
            if (apiVersionDeprecated == null) apiVersionDeprecated = false;

            delete apiVersionConfig.active;
            delete apiVersionConfig.deprecated;
            versions[apiVersion] = [];

            // copy over endpoints from previous version if needed
            inheritEndpoints(versions, previousApiVersion, apiVersion);

            // set previous api version number
            previousApiVersion = apiVersion;

            for (var i = 0; i < apiVersionConfig.endpoints.length; i++) {
                var endpointActive = apiVersionConfig.endpoints[i].active;
                // use default value if not found
                if (endpointActive == null) endpointActive = true;

                var endpointDeprecated = apiVersionConfig.endpoints[i].deprecated;
                // use default value if not found
                if (endpointDeprecated == null) endpointDeprecated = false;

                apiVersionConfig.endpoints[i].active = endpointActive && apiVersionActive;
                apiVersionConfig.endpoints[i].deprecated = endpointDeprecated || apiVersionDeprecated;
                var endpoint = new Endpoint(apiVersion, apiVersionConfig.endpoints[i]);

                // add new endpoint to the list or replace if it exists already
                pushOrReplaceRoute(versions[apiVersion], endpoint);
            }
        }
    }

    return populateRouter(versions);
}

function enableLogging(winstonLogger) {
    if (winstonLogger == null || winstonLogger == undefined) return;

    winston = winstonLogger;
}


function inheritEndpoints(versions, previousApiVersion, apiVersion) {
    if (previousApiVersion == null) {
        return;
    }

    for (var i = 0; i < versions[previousApiVersion].length; i++) {
        if (!versions[previousApiVersion][i].config.deprecated) {
            var endpointCopy = clone(versions[previousApiVersion][i]);
            endpointCopy.apiVersion = apiVersion;
            endpointCopy.config.active = true;
            versions[apiVersion].push(endpointCopy);
        }
    }
}

function pushOrReplaceRoute(endpoints, endpoint) {
    var replaced = false;
    for (var i = 0; i < endpoints.length; i++) {
        if (endpoints[i].config.route == endpoint.config.route
            && endpoints[i].config.method == endpoint.config.method) {
            endpoints[i] = endpoint;
            replaced = true;
        }
    }

    if (!replaced) {
        endpoints.push(endpoint);
    }
}

function populateRouter(versions) {
    for (var apiVersion in versions) {
        if (versions.hasOwnProperty(apiVersion)) {
            winston.debug('Adding routes for API version', apiVersion);
            for (var i = 0; i < versions[apiVersion].length; i++) {
                if (versions[apiVersion][i].config.active) {
                    constructRoute(versions[apiVersion][i]);
                }
            }
            winston.debug('');
        }
    }

    return router;
}

function constructRoute(endpoint) {
    switch (endpoint.config.method) {
        case consts.HTTP_GET:
            winston.debug('Adding route \'' + endpoint.config.method, ' /' + endpoint.apiVersion + endpoint.config.route + '\'');
            router.get('/' + endpoint.apiVersion + endpoint.config.route, function(req, res, next) {
                endpoint.config.implementation(endpoint.apiVersion, req, res, next);
            });
            break;
        case consts.HTTP_POST:
            winston.debug('Adding route \'' + endpoint.config.method, ' /' + endpoint.apiVersion + endpoint.config.route + '\'');
            router.post('/' + endpoint.apiVersion + endpoint.config.route, urlencodedParser, function(req, res, next) {
                endpoint.config.implementation(endpoint.apiVersion, req, res, next);
            });
            break;
        case consts.HTTP_DELETE:
            winston.debug('Adding route \'' + endpoint.config.method, ' /' + endpoint.apiVersion + endpoint.config.route + '\'');
            router.delete('/' + endpoint.apiVersion + endpoint.config.route, function(req, res, next) {
                endpoint.config.implementation(endpoint.apiVersion, req, res, next);
            });
            break;
        case consts.HTTP_PUT:
            winston.debug('Adding route \'' + endpoint.config.method, ' /' + endpoint.apiVersion + endpoint.config.route + '\'');
            router.put('/' + endpoint.apiVersion + endpoint.config.route, function(req, res, next) {
                endpoint.config.implementation(endpoint.apiVersion, req, res, next);
            });
            break;
        default:
            winston.debug('HTTP Method not recognised! Not adding endpoint \'' + endpoint.config.method, ' /' + endpoint.apiVersion + endpoint.config.route + '\'');
    }
}

module.exports = {
    rain: rain
};
