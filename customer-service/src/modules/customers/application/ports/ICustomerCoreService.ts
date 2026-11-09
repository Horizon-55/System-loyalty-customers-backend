import { CreateCustomerDto, CustomerResponseDto } from "../dto/CreateCustomerDto.js";

/**
 * Interface: ICustomerCoreService
 * Contract for primary customer lifecycle operations (Single Responsibility Principle).
 */
export interface ICustomerCoreService {
    getCustomerById(id: string): Promise<CustomerResponseDto>;
    registerCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto>;
    upgradeToPremium(id: string): Promise<void>;
}

