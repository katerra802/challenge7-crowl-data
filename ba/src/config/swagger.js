const swaggerJSDOC = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Documentation',
            version: '1.0.0',
            description: 'API documentation for the application',
        },
        servers: [
            {
                url: `http://${process.env.HOST_NAME || 'localhost'}:${process.env.PORT
                    || 8080}/v1/api/`,
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/routes/APIRouters.js'], // Path to the API docs
}

const swaggerSpec = swaggerJSDOC(options);

module.exports = swaggerSpec;