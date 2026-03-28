import mongoose, { Schema, Document } from 'mongoose';

export interface IOutboxEvent extends Document {
  eventType: string; // Наприклад: 'POINTS_ADDED'
  aggregateId: string; // ID клієнта, якому нарахували бали
  payload: any; // Самі дані у JSON (скільки балів, дата і т.д.)
  isProcessed: boolean; // Статус: відправлено в RabbitMQ чи ще ні
  createdAt: Date;
}

const OutboxEventSchema: Schema = new Schema({
  eventType: { type: String, required: true },
  aggregateId: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  isProcessed: { type: Boolean, default: false }, // За замовчуванням подія НЕ оброблена
  createdAt: { type: Date, default: Date.now }
});

export const OutboxEventModel = mongoose.model<IOutboxEvent>('OutboxEvent', OutboxEventSchema);