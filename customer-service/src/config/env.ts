import dotenv from 'dotenv';
//конфігурація змінних середовища
dotenv.config();

export const config = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
}