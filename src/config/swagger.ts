import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Система лояльності клієнтів API',
            version: '1.0.0',
            description: 'API до модуля системи лояльності клієнтів',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Локальний сервер',
            },
        ],
    },
    apis: ['./modules/**/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: express.Application) => {
    const router = express.Router();
    router.use('/', swaggerUi.serve);
    router.get('/', swaggerUi.setup(swaggerSpec));
    app.use('/api-docs', router);
    console.log(`🔍 Swagger документація доступна за адресою http://localhost:3000/api-docs`);
};