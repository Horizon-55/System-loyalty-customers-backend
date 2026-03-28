import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryReplSet;

export const connectToMockDatabase = async () => {
    //створення бази даних з 1 вузлом
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

    //Отримуємо згенеративний рядок підключення (URI)
    const uri = mongoServer.getUri();
    //підключення до mock сервера
    await mongoose.connect(uri);
    console.log('Підключено до MongoDb бази даних в памяті');

};

export const disconnectFromMockDatabase = async () => {
    await mongoose.disconnect();
    if (mongoServer) 
        await mongoServer.stop();
    
    console.log('Відключено від MongoDb бази даних в памяті');
}