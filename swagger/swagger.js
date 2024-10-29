const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
require('dotenv').config();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "KHCN API",
      version: "1.0.0",
      description: "API documentation for KHCN system",
    },
    servers: [
      {
        url: process.env.BASE_URL || "http://localhost:3000",
        description: "Production Server"
      },
      {
        url: "http://localhost:3000",
        description: "Development Server"
      }
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
  // Add custom CSS to improve documentation appearance
  const customCss = `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `;

  const swaggerUiOptions = {
    customCss,
    customSiteTitle: "KHCN API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
    }
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
};

module.exports = setupSwagger;