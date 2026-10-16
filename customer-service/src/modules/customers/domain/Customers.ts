import { LoyaltyTier } from "./LoyaltyTier.js";
import { CustomerSettings, PointsTransactionRecord, UserConsent, ConsentPurpose, ConsentHistoryEntry } from "./CustomerPrivacyModels.js";

export class Customers {
    private id: string;
    private name: string;
    private email: string;
    private tier: LoyaltyTier;
    private totalPoints: number;
    private phone?: string;
    private settings: CustomerSettings;
    private pointsHistory: PointsTransactionRecord[];
    private consents: Map<string, UserConsent>;
    private consentHistory: ConsentHistoryEntry[];

    constructor(
        id: string, 
        name: string, 
        email: string, 
        tier: LoyaltyTier = LoyaltyTier.STANDART, 
        totalPoints: number = 0,
        phone?: string,
        settings?: CustomerSettings,
        pointsHistory: PointsTransactionRecord[] = [],
        consents: UserConsent[] = []
    ) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.tier = tier;
        this.totalPoints = totalPoints;
        this.phone = phone;
        this.settings = settings || {
            preferredLanguage: 'uk-UA',
            notificationsEnabled: true,
            theme: 'system'
        };
        this.pointsHistory = [...pointsHistory];
        this.consents = new Map();
        this.consentHistory = [];
        for (const c of consents) {
            this.consents.set(c.purpose, c);
        }
    }

    // Публічні геттери
    public getId(): string { return this.id; }
    public getName(): string { return this.name; }
    public getEmail(): string { return this.email; }
    public getTier(): LoyaltyTier { return this.tier; }
    public getTotalPoints(): number { return this.totalPoints; }
    public getPhone(): string | undefined { return this.phone; }
    public setPhone(phone: string): void { this.phone = phone; }

    public getSettings(): CustomerSettings { return { ...this.settings }; }
    public setSettings(settings: Partial<CustomerSettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    public getPointsHistory(): PointsTransactionRecord[] { return [...this.pointsHistory]; }
    public addPointsTransaction(record: PointsTransactionRecord): void {
        this.pointsHistory.push(record);
    }

    public getConsents(): UserConsent[] {
        return Array.from(this.consents.values());
    }

    public getConsent(purpose: ConsentPurpose): UserConsent | undefined {
        return this.consents.get(purpose);
    }

    public setConsent(consent: UserConsent): void {
        this.consents.set(consent.purpose, consent);
    }

    public getConsentHistory(): ConsentHistoryEntry[] {
        return [...this.consentHistory];
    }

    /**
     * GDPR Article 7: Надання згоди на конкретну мету із фіксацією версії політики та каналу
     */
    public grantConsent(purpose: ConsentPurpose, policyVersion: string = "v1.0", source: string = "web_portal", actorId: string = this.id): UserConsent {
        const now = new Date().toISOString();
        const existing = this.consents.get(purpose);
        const consent: UserConsent = {
            userId: this.id,
            purpose,
            isGranted: true,
            policyVersion,
            grantedAt: existing?.grantedAt || now,
            withdrawnAt: undefined,
            updatedAt: now,
            source
        };
        this.consents.set(purpose, consent);
        this.consentHistory.push({
            action: 'GRANT',
            purpose,
            isGranted: true,
            policyVersion,
            timestamp: now,
            source,
            actorId
        });
        return consent;
    }

    /**
     * GDPR Article 7(3): Відкликання згоди з негайним припиненням дії та фіксацією мітки часу
     */
    public revokeConsent(purpose: ConsentPurpose, source: string = "web_portal", actorId: string = this.id): UserConsent {
        const now = new Date().toISOString();
        const existing = this.consents.get(purpose);
        const policyVersion = existing?.policyVersion || "v1.0";
        const consent: UserConsent = {
            userId: this.id,
            purpose,
            isGranted: false,
            policyVersion,
            grantedAt: existing?.grantedAt,
            withdrawnAt: now,
            updatedAt: now,
            source
        };
        this.consents.set(purpose, consent);
        this.consentHistory.push({
            action: 'REVOKE',
            purpose,
            isGranted: false,
            policyVersion,
            timestamp: now,
            source,
            actorId
        });
        return consent;
    }

    /**
     * Незворотна анонімізація суб'єкта даних (GDPR Article 17: Right to Erasure)
     */
    public anonymize(anonymousEmail: string, anonymousName: string = "Anonymous User"): void {
        this.name = anonymousName;
        this.email = anonymousEmail;
        this.phone = undefined;
        this.consents.clear();
        this.consentHistory = [];
        this.settings = {
            preferredLanguage: 'uk-UA',
            notificationsEnabled: false,
            theme: 'system'
        };
    }

    public isAnonymized(): boolean {
        return this.email.endsWith('@anon.local');
    }

    // Бізнес-логіка додавання балів та автоматичний перерахунок статусу
    public addPoints(points: number, reason: string = "Базове нарахування балів"): void {
        if (points <= 0) throw new Error("Кількість балів повинна бути більше 0");

        this.totalPoints += points;
        this.addPointsTransaction({
            transactionId: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            points,
            reason,
            timestamp: new Date().toISOString()
        });
        this.evaluateTier();
    }

    // Бізнес-логіка визначення рівня лояльності
    public evaluateTier(): void {
        if (this.totalPoints >= 1000) { this.tier = LoyaltyTier.VIP; }
        else if (this.totalPoints >= 700) { this.tier = LoyaltyTier.PREMIUM; }
        else if (this.totalPoints >= 500) { this.tier = LoyaltyTier.GOLD; }
        else { this.tier = LoyaltyTier.STANDART; }
    }
}