require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const viewEngine = require('./src/config/viewEngine');
const APIRoutes = require('./src/routes/APIRoutes');
const db = require('./src/config/db');
const swaggerSpec = require('./src/config/swagger');
const swaggerUi = require('swagger-ui-express');
const PORT = process.env.PORT || 8080;
const HOST_NAME = process.env.HOST_NAME || 'localhost';
const crawlData = require('./src/jobs/newsCrawlerJob');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

viewEngine(app);

app.use('/v1/api/', APIRoutes);

app.use(`/${process.env.SWAGGER_URL}`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
        docExpansion: 'none',
        defaultModelsExpandDepth: -1,
        defaultModelrendering: 'model',
        tryItOutEnabled: true,
    },
}))

const startServer = async () => {
    try {
        await db();
        app.listen(PORT, HOST_NAME, () => {
            console.log(`Server is running on http://${HOST_NAME}:${PORT}`);
        });
        crawlData.start();
    } catch (error) {
        console.error('Failed to start the server:', error);
    }
}

startServer();