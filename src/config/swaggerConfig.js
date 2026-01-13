require("module-alias/register");
const swaggerJSDoc = require("swagger-jsdoc");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "DevSync API Documentation",
      version: "1.0.0",
      description: "DevSync Backend API documentation",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT}`,
        description: "DevSync API Server | Development",
      },
    ],
    // Security tanımları ekleyin
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Access Token'ınızı buraya girin",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Swagger UI options
const swaggerUiOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    withCredentials: true, // Cookie'leri gönder
  },
};

module.exports = { swaggerSpec, swaggerUiOptions };
