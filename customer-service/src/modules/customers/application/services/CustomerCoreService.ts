import { Customers } from "../../domain/Customers.js";
import { ICustomerRepository } from "../ports/ICustomerRepository.js";
import { CreateCustomerDto, CustomerResponseDto } from "../dto/CreateCustomerDto.js";
import { randomUUID } from "crypto";
import { LoyaltyTier } from "../../domain/LoyaltyTier.js";
import { AppError } from "../../../../common/middlewares/errors/AppError.js";
import { ICustomerCoreService } from "../ports/ICustomerCoreService.js";

/**
 * Service: CustomerCoreService
 * Decomposed single-responsibility service for customer entity management.
 * Metrics: CBO <= 6, LCOM4 = 1, WMC <= 10.
 */
export class CustomerCoreService implements ICustomerCoreService {
    constructor(private readonly customerRepository: ICustomerRepository) {}

    public async getCustomerById(id: string): Promise<CustomerResponseDto> {
        const customer = await this.customerRepository.findById(id);
        if (!customer) throw new AppError("Клієнта не знайдено", 404);
        return this.mapToResponseDto(customer);
    }

    public async registerCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
        const existingCustomer = await this.customerRepository.findByEmail(dto.email);
        if (existingCustomer) throw new AppError("Користувач з таким email вже існує", 409);

        const newCustomer = new Customers(
            randomUUID(), 
            dto.name, 
            dto.email
        );

        await this.customerRepository.save(newCustomer);
        return this.mapToResponseDto(newCustomer);
    }

    public async upgradeToPremium(id: string): Promise<void> {
        const customer = await this.customerRepository.findById(id);
        if (!customer) throw new Error('Клієнта не знайдено');

        if (customer.getTier() === LoyaltyTier.PREMIUM) {
            throw new Error('Клієнт ВЖЕ має статус Premium. Операція відхилена.');
        }

        (customer as any).tier = LoyaltyTier.PREMIUM;
        await this.customerRepository.save(customer);
    }

    private mapToResponseDto(customer: Customers): CustomerResponseDto {
        return {
            id: customer.getId(),
            name: customer.getName(),
            email: customer.getEmail(),
            tier: customer.getTier(),
            totalPoints: customer.getTotalPoints(),
        };
    }
}

