**totoro-node**
===============


Totoro is a Node.js module to help simplify route management and reduce code duplication for multiple API versions. Totoro will keep you dry!

This module allows you to easily define multiple API versions which can inherit endpoints from previous versions or override the functionality of an endpoint in a subsequent version of the API.

Totoro uses [express](https://expressjs.com/) to create a router with all the routes you define in the API version definition. It returns a router with routes to each of your defined endpoints that can be easily modified, deprecated or disabled as your API changes and grows over time.

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
        v1: { // this is an API version definition
            active: true, // this parameter are optional but the default value is true when not specified
            deprecated: false, // this parameter are optional but the default value is false when not specified
            endpoints: [
                {
                    route: "/test/endpoint",
                    method: "GET",
                    active: true, // this parameter are optional but the default value is true when not specified
                    deprecated: false, // this parameter are optional but the default value is false when not specified
                    implementation: originalImplementationFunction
                },
                {
                    route: "/another/test/endpoint",
                    method: "POST",
                    implementation: anotherImplementationFunction
                }
            ]
        },
        v2: {
            endpoints: [
                {
                    route: "/test/endpoint",
                    method: "GET",
                    implementation: overridingOriginalImplementationFunction
                }
            ]
        }
    }));

This returns a router with the following routes:

    /api/v1/test/endpoint
    /api/v1/another/test/endpoint
    /api/v2/test/endpoint - overrides original implementation from version v1
    /api/v2/another/test/endpoint

All the previous endpoints in version `v1` are carried over to version `v2` but any endpoints that are redefined in `v2` will override the original endpoint with the new `v2` implementation. This type of inheritance and overriding can be controlled using the `active` and `deprecated` fields in the API versioning definition above.

----------

Logging is performed using [Winston](https://www.npmjs.com/package/winston) by logging debug messages. Logging can be enabled by passing a reference to the Winston logger when calling the `rain` function. 

    totoro.rain({<configuration>}, winstonLogger)

----------

The configuration map used in the `rain` function contains a few fields:

 - `active` (optional)
	 - This indicates whether or not the endpoint should be added to the current version of your API. If this field is set to false for an entire API version then that version will no longer be accessible but subsequent versions of the API will still inherit all the endpoints of this disabled version. This allows you to easily bump the version of an entire API while updating the implementation of specific endpoints in the next version.
     If this field is set to false for a specific endpoint definition then only that endpoint is excluded from the version. But, as before the endpoint is still inherited by later versions of the API meaning you can provide an updated implementation if you no longer want the old version to be used. By default this is set to true.

 - `deprecated` (optional)
	 - This field allows you to disable the inheritance of an entire API or a specific set of endpoints in later versions of your API. By setting this to true, the endpoint or API version will no longer be accessible in subsequent versions of the API but will still be included in the current version. This is most to support legacy applications that may not have upgraded to your latest API version. By default this is set to false.

 - `method` (required)
	- This can only be defined in the endpoint definition, not the API version definition! It specifies the HTTP method used for that endpoint.

 - `endpoints` (required)
	- This is the list of endpoints for the API version definition. Each of the endpoints that you define will create a corresponding route in the router.

 - `implementation` (required)
	- This points to a function which will be invoked when the endpoint is called. The function must accept three parameters; apiVersion, req, res, next e.g. `function(apiVersion, req, res, next) { <endpoint implementation> }` This is based on the [express](https://expressjs.com/en/guide/routing.html) functions `get`, `post`, `delete` and `put` each of which require `req`, `res` and `next` parameters.
	    - `apiVersion`
		    - This is the API version of the endpoint being called. In the above example, it would be `v1` and `v2` respectively. This can be used in your endpoint implementation function to decide which version of the endpoint is being called. If you choose to reuse the same implementation function across multiple versions but want to make a minor change for one specific version of the endpoint then this will help avoid the need to create another implementation function.
	    - `req`
		    - This is the [express](https://expressjs.com/en/guide/routing.html) router parameter which holds all the request data when the endpoint is called.
	    - `res`
		    - This is the [express](https://expressjs.com/en/guide/routing.html) router parameter used to send a response when the endpoint is called.
	    - `next`
		    - This is the [express](https://expressjs.com/en/guide/routing.html) router parameter used to pass control to the next handler when the endpoint is called.


----------
If you have any suggestions or encounter any problems using this module then feel free to open an issue on [GitHub](https://github.com/VGJohn/totoro).
Thank you for reading :)
