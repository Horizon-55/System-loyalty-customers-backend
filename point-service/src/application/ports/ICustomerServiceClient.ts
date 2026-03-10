export interface ICustomerServiceClient {
   //Повертає true, якщо клієнт існує в Customer Service
    checkCustomerExists(customerId: string): Promise<boolean>;
  }