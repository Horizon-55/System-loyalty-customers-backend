import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

export const connectToMockDatabase = async () => {
    //створення mock сервера
    mongoServer = await MongoMemoryServer.create();

    //Отримуємо згенеративний рядок підключення (URI)
    const uri = mongoServer.getUri();
    //підключення до mock сервера
    await mongoose.connect(uri);
    console.log('🔌Підключено до MongoDb бази даних в памяті');

};

export const disconnectFromMockDatabase = async () => {
    await mongoose.disconnect();
    if (mongoServer) 
        await mongoServer.stop();
    
    console.log('🔌Відключено від MongoDb бази даних в памяті');
}