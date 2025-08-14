"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = void 0;
const common_1 = require("@nestjs/common");
const redis_client_1 = require("./redis.client");
const session_cache_service_1 = require("./session-cache.service");
const usage_cache_service_1 = require("./usage-cache.service");
/**
 * Redis模块 - 全局可用的缓存服务
 */
let RedisModule = class RedisModule {
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            redis_client_1.RedisClient,
            session_cache_service_1.SessionCacheService,
            usage_cache_service_1.UsageCacheService,
        ],
        exports: [
            redis_client_1.RedisClient,
            session_cache_service_1.SessionCacheService,
            usage_cache_service_1.UsageCacheService,
        ],
    })
], RedisModule);
