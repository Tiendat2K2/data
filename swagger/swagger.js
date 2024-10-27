const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
// Nạp biến môi trường
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
        url: "http://localhost:3000", // Hardcoded URL
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
