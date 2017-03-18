**totoro-node**
===============


Totoro is a Node.js module to help simplify route management and reduce code duplication for multiple API versions. Let Totoro keep you dry!

This module allows you to easily define multiple API versions which can inherit endpoints from previous versions or override the current functionality of an endpoint in a subsequent version of the API.

Totoro uses [express](https://expressjs.com/) to create routes :)

----------

Installation

    npm install totoro-node

or add a dependency to your package.json

    "totoro-node": "<version>"


----------


Usage

    var express = require('express')
    var app = express();

    var totoro = require('totoro-node');

    app.use('/api', totoro.rain({
        v1: {
            active: true,
            deprecated: false,
            "/test/endpoint": {
                method: "GET",
                active: true,
                deprecated: false,
                endpointImplementation: originalImplementationFunction
            },
            "/another/test/endpoint": {
                method: "POST",
                active: true,
                deprecated: false,
                endpointImplementation: anotherImplementationFunction
            }
        },
        v2: {
            active: true,
            deprecated: false,
            "/test/endpoint": {
                method: "GET",
                active: true,
                deprecated: false,
                endpointImplementation: overridingOriginalImplementationFunction
            }
        }
    }));

This returns a router with the following routes:

    /api/v1/test/endpoint
    /api/v1/another/test/endpoint
    /api/v2/test/endpoint


----------

Logging can be enabled by passing an extra parameter when calling the "rain" function.

    totoro.rain({<configuration>}, true)

----------

The configuration map used in the "rain" function contains a few required fields:

 - `active`
	 - This indicates whether or not the endpoint should be added to the router. If this field is set to false in the API version definition then it will not include any endpoints specified for that API version in the router. If this field is set to false in a specific endpoint definition then only that endpoint is excluded from the router. This offers you the ability to easily enable or disabled full versions or specific endpoints of your API.

 - `deprecated`
	 - This indicates whether or not an endpoint should be added to following versions of the API. If this field is set to true in the API version definition then it will still add all the endpoints to the current API but subsequent versions of the API will not have these endpoints included. As before, you can specify this per API version or per endpoint for your API.

 - `method`
	- This can only be defined in the endpoint definition! It specifies the HTTP method used for that endpoint.

 - `endpointImplementation`
	- This points to a function which will be invoked when the endpoint is called. The function must accept three parameters; apiVersion, req, res e.g. `function(apiVersion, req, res) { <endpoint implementation> }`
		- `apiVersion`
			- This is the API version for the endpoint being called. In the above example, it would be "v1" and "v2" respectively.
		- `req`
			- This is the express router parameter which holds all the request data when the endpoint is called.
	 - `res`
		 - This is the express router parameter used to send a response when the endpoint is called.


----------
Thank you for reading :)
