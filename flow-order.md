Client                    Order Service              RabbitMQ                    Payment Service              Product (Inventory)      Notification Service
   |                             |                        |                              |                                |                                |
   |  POST /orders               |                        |                              |                                |                                |
   |---------------------------->|                        |                              |                                |                                |
   |                             | 1. Validate user/product                             |                                |                                |
   |                             | 2. Save order (order_db)                              |                                |                                |
   |                             | 3. Publish order.created                              |                                |                                |
   |                             |----------------------->|                              |                                |                                |
   |                             |                        | Fan-out: payment.orders -----|-----> Consume + payment        |                                |
   |                             |                        |            inventory.orders -|----------------------------->| Reserve stock                 |
   |                             |                        |            notification.orders|--------------------------------|-----------------------------> Consume
   |  Order response             |                        |                              |                                | On fail: inventory.reservation_failed
   |<----------------------------|                        |                              |                                |---------> Order Service: set order cancelled
   |                             |                        | payment.completed/failed --->|                                | On payment.failed: release stock (compensation)
   |                             |                        |------------------------------|-----> Order: confirmed/failed  |<-------- consume payment.failed
   |                             |                        |                              |                                |
   | Saga (choreography): Reserve inventory -> Payment. If payment fails, Product service releases reserved stock.
   | If inventory reserve fails, order-service sets order to cancelled.