import { Customers } from "../domain/Customers.js";
import { ICustomerRepository } from "../application/ports/ICustomerRepository.js";

export class InMemoryCustomerRepository implements ICustomerRepository {
    //для іммітації можна використати map
    private customers: Map<string, Customers> = new Map();
    //збереження користувача
    public async save(customer: Customers): Promise<Customers> {
        this.customers.set(customer.getId(), customer);
        return customer;
    }
    //пошук користувача за id
    public async findById(id: string): Promise<Customers | null> {
        return this.customers.get(id) || null;
    }
    //пошук користувача за email
    public async findByEmail(email: string): Promise<Customers | null> {
        return Array.from(this.customers.values()).find(customer => customer.getEmail() === email) || null;
    }
}