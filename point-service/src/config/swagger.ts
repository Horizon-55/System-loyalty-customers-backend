import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';

// РЕФАКТОРИНГ: Додано префікс 'node:' для вбудованих модулів (Maintainability)
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// РЕФАКТОРИНГ: Замінено replace() з регулярним виразом на безпечніший replaceAll() (Reliability)
const apiGlobBasePath = path.resolve(__dirname, '../api').replaceAll('\\', '/');

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Point Service',
            version: '1.0.0',
            description: 'Мікросервіс управління балами лояльності',
        },
        servers: [
            {
                url: 'http://localhost:3002',
                description: 'Локальний сервер',
            },
        ],
    },
    apis: [
        `${apiGlobBasePath}/**/*.ts`,
        `${apiGlobBasePath}/**/*.js`
    ],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: express.Application) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('📄 Swagger UI (Point Service) доступний за адресою: http://localhost:3002/api-docs');
};