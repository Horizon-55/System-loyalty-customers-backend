import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class CreateCustomerDto {
    @IsEmail({}, { message: 'Некоректний email' })
    @IsNotEmpty({ message: 'Email є обов\'язковим' })
    email!: string;

    @IsString({ message: 'Ім\'я повинно бути рядком' })
    @IsNotEmpty({ message: 'Ім\'я є обов\'язковим' })
    @Length(2, 50, { message: 'Ім\'я повинно бути від 3 до 50 символів' })
    name!: string;
}

export interface CustomerResponseDto {
    id: string;
    name: string;
    email: string;
    tier: string; //Cтатус користувача
    totalPoints: number;
}