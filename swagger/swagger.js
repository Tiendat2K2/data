const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
require('dotenv').config();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "KHCN",
      version: "1.0.0",
      description: "API for user authentication",
    },
    servers: [
      {

        url: "http://localhost:3000", // Ensure 'http://' is included
        url: process.env.BASE_URL || "https://data-e7wi.onrender.com", // Default to local URL if BASE_URL is not set

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
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ["routes/*.js"], 
};

const swaggerSpec = swaggerJsDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;