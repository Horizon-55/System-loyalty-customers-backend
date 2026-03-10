export class AppError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;

        //Відновлюємо прототип ланцюжка 
        Object.setPrototypeOf(this, AppError.prototype);

        //Зберігаю стек для зручного дебагу
        Error.captureStackTrace(this);
    }
}