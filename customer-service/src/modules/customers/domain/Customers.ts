import {LoyaltyTier} from "./LoyaltyTier.js";

export class Customers {
    private id: string;
    private name: string;
    private email: string;
    private tier: LoyaltyTier;
    private totalPoints: number;

    constructor(id: string, name: string, email: string, tier: LoyaltyTier = LoyaltyTier.STANDART, totalPoints: number = 0) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.tier = tier;
    this.totalPoints = totalPoints;
    }
    //публічні геттери 
    public getId(): string {return this.id;}
    public getName(): string {return this.name;}
    public getEmail(): string {return this.email;}
    public getTier(): LoyaltyTier {return this.tier;}
    public getTotalPoints(): number {return this.totalPoints;}

    //бізнес логіка додавання балів та автоматичний перерахунок статусу 
    public addPoints(points: number): void {
        if (points <= 0) throw new Error ("Кількість балів повинна бути більше 0");

        this.totalPoints += points;
        this.evaluateTier();
    }
    //бізнес логіка Визначення рівня лояльності
    public evaluateTier(): void {
        if (this.totalPoints >= 1000) { this.tier = LoyaltyTier.VIP; }
        else if (this.totalPoints >= 700) { this.tier = LoyaltyTier.PREMIUM; }
        else if (this.totalPoints >= 500) {this.tier = LoyaltyTier.GOLD;}
        else {this.tier = LoyaltyTier.STANDART;}
    }
}