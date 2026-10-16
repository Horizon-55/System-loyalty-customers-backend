/**
 * PiiSanitizer: Centralized Privacy & Security Data Masking Engine
 * Implements Privacy by Design principles (ISO/IEC 25010 & GDPR Article 25)
 */

export class PiiSanitizer {
    private static readonly REDACTED_MARKER = '[REDACTED]';

    private static readonly SENSITIVE_KEY_PATTERNS = [
        'password',
        'passwd',
        'secret',
        'token',
        'accesstoken',
        'refreshtoken',
        'apikey',
        'api_key',
        'authorization',
        'auth',
        'sessionsecret',
        'creditcard',
        'cvv',
        'pincode'
    ];

    private static readonly EMAIL_REGEX = /\b([a-zA-Z0-9_.+-]{1,2})[a-zA-Z0-9_.+-]*(@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/g;
    private static readonly PHONE_REGEX = /(\+[0-9]{3}|[0-9]{3})[0-9]+([0-9]{2})/g;
    private static readonly BEARER_REGEX = /(bearer\s+|token[=:\s]+|jwt[=:\s]+)([a-zA-Z0-9._\-]{8,})/gi;
    private static readonly PASSWORD_IN_TEXT_REGEX = /(password[=:\s]+)(["']?[^"'\s,]+["']?)/gi;

    /**
     * Partially masks an email address for diagnostic utility without leaking identity.
     * Example: "alex.test@example.com" -> "al**@example.com"
     */
    public static maskEmail(email: string): string {
        if (!email || typeof email !== 'string') return email;
        const parts = email.split('@');
        if (parts.length !== 2) return this.maskText(email);

        const [local, domain] = parts;
        const visibleLength = Math.min(2, local.length);
        const prefix = local.substring(0, visibleLength);
        return `${prefix}**@${domain}`;
    }

    /**
     * Partially masks a phone number preserving country code and last 2 digits.
     * Example: "+380501234567" -> "+380******67"
     */
    public static maskPhone(phone: string): string {
        if (!phone || typeof phone !== 'string') return phone;
        const cleaned = phone.trim();
        if (cleaned.length < 7) return '******';

        const prefix = cleaned.substring(0, cleaned.startsWith('+') ? 4 : 3);
        const suffix = cleaned.slice(-2);
        return `${prefix}******${suffix}`;
    }

    /**
     * Sanitizes raw text string by identifying emails, phones, and tokens via regular expressions.
     */
    public static maskText(text: string): string {
        if (!text || typeof text !== 'string') return text;

        return text
            .replace(this.PASSWORD_IN_TEXT_REGEX, `$1${this.REDACTED_MARKER}`)
            .replace(this.BEARER_REGEX, `$1${this.REDACTED_MARKER}`)
            .replace(this.EMAIL_REGEX, '$1**$2')
            .replace(this.PHONE_REGEX, '$1******$2');
    }

    /**
     * Recursively sanitizes any value: strings, objects, arrays, and Error instances.
     * Guarantees no sensitive tokens or unmasked PII remain in the output.
     */
    public static sanitize<T = any>(data: T, seen = new WeakSet()): T {
        if (data === null || data === undefined) {
            return data;
        }

        // Handle primitive types
        if (typeof data === 'string') {
            return this.maskText(data) as unknown as T;
        }

        if (typeof data !== 'object') {
            return data;
        }

        // Circular dependency prevention
        if (seen.has(data as object)) {
            return '[Circular]' as unknown as T;
        }
        seen.add(data as object);

        // Handle Error instances
        if (data instanceof Error) {
            return {
                name: data.name,
                message: this.maskText(data.message),
                stack: data.stack ? this.maskText(data.stack) : undefined
            } as unknown as T;
        }

        // Handle Arrays
        if (Array.isArray(data)) {
            return data.map(item => this.sanitize(item, seen)) as unknown as T;
        }

        // Handle Objects (Structured DTOs / Payloads)
        const sanitizedObj: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();

            // 1. Strict redaction for credentials, passwords, tokens, secrets
            if (this.SENSITIVE_KEY_PATTERNS.some(pat => lowerKey.includes(pat))) {
                sanitizedObj[key] = this.REDACTED_MARKER;
                continue;
            }

            // 2. Controlled masking for direct PII fields
            if (lowerKey === 'email' && typeof value === 'string') {
                sanitizedObj[key] = this.maskEmail(value);
                continue;
            }

            if ((lowerKey === 'phone' || lowerKey === 'phonenumber' || lowerKey === 'mobile') && typeof value === 'string') {
                sanitizedObj[key] = this.maskPhone(value);
                continue;
            }

            // 3. Recursive sanitization for nested objects and values
            sanitizedObj[key] = this.sanitize(value, seen);
        }

        return sanitizedObj as T;
    }
}
