import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './infrastructure/http/routes/index.js';
import { requestLogger } from './infrastructure/http/middlewares/index.js';
import { logger } from './infrastructure/logging/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://unpkg.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        imgSrc: ["'self'", 'data:', 'https://raw.githubusercontent.com'],
      },
    },
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(requestLogger);

app.use(routes);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
