var express = require('express');
var router = express.Router();
var winston = require('winston');
var consts = require('./consts.js');
var Endpoint = require('./objects/Endpoint.js');
var clone = require('clone');
var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({ extended: false })

winston.level = consts.LOG_LEVEL;

var rainWithLogging = function(apiConfig, logging) {
    if (logging) {
        winston.add(winston.transports.Console);
    } else {
        winston.remove(winston.transports.Console);
    }

    rain(apiConfig);
}

var rain = function(apiConfig) {
    var versions = {};
    var previousApiVersion = null;

    for (var apiVersion in apiConfig) {
        if (apiConfig.hasOwnProperty(apiVersion)) {
            var apiVersionConfig = apiConfig[apiVersion];
            var apiVersionActive = apiVersionConfig.active;
            var apiVersionDeprecated = apiVersionConfig.deprecated;
            delete apiVersionConfig.active;
            delete apiVersionConfig.deprecated;
            versions[apiVersion] = [];

            // copy over endpoints from previous version if needed
            inheritEndpoints(versions, previousApiVersion, apiVersion);

            // set previous api version number
            previousApiVersion = apiVersion;

            for (var endpoint in apiVersionConfig) {
                if (apiVersionConfig.hasOwnProperty(endpoint)) {

                    apiVersionConfig[endpoint].active = apiVersionConfig[endpoint].active && apiVersionActive;
                    apiVersionConfig[endpoint].deprecated = apiVersionConfig[endpoint].deprecated || apiVersionDeprecated;
                    var endpoint = new Endpoint(apiVersion, endpoint, apiVersionConfig[endpoint]);

                    // add new endpoint to the list or replace if it exists already
                    pushOrReplaceEndpoint(versions[apiVersion], endpoint);
                }
            }
        }
    }

    return populateRouter(versions);
}

function inheritEndpoints(versions, previousApiVersion, apiVersion) {
    if (previousApiVersion == null) {
        return;
    }

    for (var i = 0; i < versions[previousApiVersion].length; i++) {
        if (!versions[previousApiVersion][i].endpointConfig.deprecated) {
            var endpointCopy = clone(versions[previousApiVersion][i]);
            endpointCopy.apiVersion = apiVersion;
            endpointCopy.endpointConfig.active = true;
            versions[apiVersion].push(endpointCopy);
        }
    }
}

function pushOrReplaceEndpoint(endpoints, endpoint) {
    var replaced = false;
    for (var i = 0; i < endpoints.length; i++) {
        if (endpoints[i].endpoint == endpoint.endpoint
            && endpoints[i].endpointConfig.method == endpoint.endpointConfig.method) {
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
                if (versions[apiVersion][i].endpointConfig.active) {
                    constructRoute(versions[apiVersion][i]);
                }
            }
            winston.debug('');
        }
    }

    return router;
}

function constructRoute(endpoint) {
    switch (endpoint.endpointConfig.method) {
        case consts.HTTP_GET:
            winston.debug('Adding route \'' + endpoint.endpointConfig.method, ' /' + endpoint.apiVersion + endpoint.endpoint + '\'');
            router.get('/' + endpoint.apiVersion + endpoint.endpoint, function(req, res) {
                endpoint.endpointConfig.endpointImplementation(endpoint.apiVersion, req, res);
            });
            break;
        case consts.HTTP_POST:
            winston.debug('Adding route \'' + endpoint.endpointConfig.method, ' /' + endpoint.apiVersion + endpoint.endpoint + '\'');
            router.post('/' + endpoint.apiVersion + endpoint.endpoint, urlencodedParser, function(req, res) {
                endpoint.endpointConfig.endpointImplementation(endpoint.apiVersion, req, res);
            });
            break;
        case consts.HTTP_DELETE:
            winston.debug('Adding route \'' + endpoint.endpointConfig.method, ' /' + endpoint.apiVersion + endpoint.endpoint + '\'');
            router.delete('/' + endpoint.apiVersion + endpoint.endpoint, function(req, res) {
                endpoint.endpointConfig.endpointImplementation(endpoint.apiVersion, req, res);
            });
            break;
        case consts.HTTP_PUT:
            winston.debug('Adding route \'' + endpoint.endpointConfig.method, ' /' + endpoint.apiVersion + endpoint.endpoint + '\'');
            router.put('/' + endpoint.apiVersion + endpoint.endpoint, function(req, res) {
                endpoint.endpointConfig.endpointImplementation(endpoint.apiVersion, req, res);
            });
            break;
        default:
            winston.debug('HTTP Method not recognised! Not adding endpoint \'' + endpoint.endpointConfig.method, ' /' + endpoint.apiVersion + endpoint.endpoint + '\'');
    }
}

module.exports = {
    rain: rain,
    rainWithLogging: rainWithLogging
};
