Client                    Order Service              RabbitMQ                    Payment Service              Notification Service
   |                             |                        |                              |                                |
   |  POST /orders               |                        |                              |                                |
   |---------------------------->|                        |                              |                                |
   |                             | 1. Validate user/product                             |                                |
   |                             | 2. Save order (order_db)                              |                                |
   |                             | 3. Publish to ecommerce.events                       |                                |
   |                             |    routing key: order.created                         |                                |
   |                             |----------------------->|                              |                                |
   |                             |                        | 4. Fan-out to queues         |                                |
   |                             |                        |    payment.orders  ----------|-----> 5. Consume                 |
   |                             |                        |    notification.orders -----|-----------------------------> 5. Consume
   |  Order response             |                        |                              | 6. Idempotency + payment       | 6. Idempotency + "email"
   |<----------------------------|                        |                              | 7. ack                         | 7. ack
   |                             |                        |                              | (or retry then DLQ)            | (or retry then DLQ)