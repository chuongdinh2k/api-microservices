/** Event names and payloads for async messaging (RabbitMQ) */

export const EXCHANGE = 'ecommerce.events';
export const DLX_EXCHANGE = 'ecommerce.dlx';

export const ROUTING_KEYS = {
  ORDER_CREATED: 'order.created',
  PAYMENT_COMPLETED: 'payment.completed',
} as const;

export interface OrderCreatedPayload {
  eventId: string;
  orderId: string;
  userId: string;
  totalAmount: number;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  createdAt: string;
}

export interface PaymentCompletedPayload {
  eventId: string;
  orderId: string;
  paymentId: string;
  status: string;
  amount: number;
}
