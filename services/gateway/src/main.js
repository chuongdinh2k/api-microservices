"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const shared_1 = require("@ecommerce/shared");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalFilters(new shared_1.AllExceptionsFilter());
    const port = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 3000);
    await app.listen(port);
    console.log(`Gateway listening on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map