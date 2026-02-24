import {Customers} from "../../domain/Customers.js";

export interface ICustomerRepository {
    save(customer: Customers): Promise<Customers>;
    findById(id: string): Promise<Customers | null>;
    findByEmail(email: string): Promise<Customers | null>;
}

