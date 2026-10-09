import { Customers } from "../domain/Customers.js";
import { ICustomerRepository } from "./ports/ICustomerRepository.js";
import { CreateCustomerDto, CustomerResponseDto } from "./dto/CreateCustomerDto.js";
import { randomUUID } from "crypto";
import { LoyaltyTier } from "../domain/LoyaltyTier.js";
import { AppError } from "../../../common/middlewares/errors/AppError.js";

export class CustomerService {
    constructor(private readonly customerRepository: ICustomerRepository) {}

    public async getCustomerById(id: string): Promise<CustomerResponseDto> {
        const customer = await this.customerRepository.findById(id); //якщо клієнта знайдено, то повертаємо його
        if (!customer) throw new AppError("Клієнта не знайдено", 404); //якщо клієнта не знайдено, кидаємо 404
        return this.mapToResponceDto(customer); //якщо клієнта знайдено, то повертаємо його
    }

    public async registerCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
        //перевірка на існування такого користувача
        const existingCustomer = await this.customerRepository.findByEmail(dto.email);
        if (existingCustomer) throw new AppError("Користувач з таким email вже існує", 409);

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

    /**
   * НОВИЙ МЕТОД ДЛЯ САГИ: Видача Premium-статусу
   */
  public async upgradeToPremium(id: string): Promise<void> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) 
      throw new Error('Клієнта не знайдено');

    // Штучна умова для тестування компенсації (відкату)
    if (customer.getTier() === LoyaltyTier.PREMIUM) 
      throw new Error('Клієнт ВЖЕ має статус Premium. Операція відхилена.');
    
    // Якщо все добре — оновлюємо статус
   (customer as any).tier = LoyaltyTier.PREMIUM;
    
    // Зберігаємо зміни в базу (через репозиторій)
    await this.customerRepository.save(customer); 
  }
}