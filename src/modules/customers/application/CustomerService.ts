import {Customers} from "../domain/Customers.js";
import { ICustomerRepository } from "./ports/ICustomerRepository.js";
import { CreateCustomerDto, CustomerResponseDto } from "./dto/CreateCustomerDto.js";
import { randomUUID } from "crypto";

export class CustomerService {
    constructor(private readonly customerRepository: ICustomerRepository) {}

    public async registerCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
        //перевірка на існування такого користувача
        const existingCustomer = await this.customerRepository.findByEmail(dto.email);
        if (existingCustomer) throw new Error("Користувач з таким email вже існує");

        //2. Створення доменної сутності
        const newCustomer = new Customers(
        randomUUID(), 
        dto.name, 
        dto.email);

        //3. Збереження абстракції (інтерфейс)
        await this.customerRepository.save(newCustomer);

        //4.Мапінг доменної сутності на DTO
        return this.mapToResponceDto(newCustomer);
    }
    //ручний мапінг доменної сутності на DTO
    private mapToResponceDto(customer: Customers): CustomerResponseDto {
        return {
            id: customer.getId(),
            name: customer.getName(),
            email: customer.getEmail(),
            tier: customer.getTier(),
            totalPoints: customer.getTotalPoints(),
        }
    }
}