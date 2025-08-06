const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const { createClient } = require('redis');
const dayjs = require('dayjs');

class DatabaseTester {
    constructor() {
        this.connections = {
            mysql: { status: 'not_configured', error: null, lastCheck: null, responseTime: null },
            mongodb: { status: 'not_configured', error: null, lastCheck: null, responseTime: null },
            redis: { status: 'not_configured', error: null, lastCheck: null, responseTime: null }
        };
        
        this.clients = {
            mysql: null,
            mongodb: null,
            redis: null
        };

        this.initializeConnections();
        this.startPeriodicChecks();
    }

    initializeConnections() {
        if (this.shouldTestMysql()) {
            this.connections.mysql.status = 'connecting';
            this.testMysqlConnection();
        }

        if (this.shouldTestMongodb()) {
            this.connections.mongodb.status = 'connecting';
            this.testMongodbConnection();
        }

        if (this.shouldTestRedis()) {
            this.connections.redis.status = 'connecting';
            this.testRedisConnection();
        }
    }

    shouldTestMysql() {
        return process.env.MYSQL_HOST !== undefined;
    }

    shouldTestMongodb() {
        return process.env.MONGO_HOST !== undefined;
    }

    shouldTestRedis() {
        return process.env.REDIS_HOST !== undefined;
    }

    async testMysqlConnection() {
        const startTime = Date.now();
        try {
            const config = {
                host: process.env.MYSQL_HOST,
                port: process.env.MYSQL_PORT || 3306,
                user: process.env.MYSQL_USER || 'root',
                password: process.env.MYSQL_PASSWORD || '',
                database: process.env.MYSQL_DATABASE,
                connectTimeout: 5000,
                authPlugin: process.env.MYSQL_AUTH_PLUGIN || 'mysql_native_password'
            };

            // Add SSL/TLS support if flag is set
            if (process.env.MYSQL_SSL === 'true') {
                config.ssl = {
                    rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false'
                };
            }

            if (this.clients.mysql) {
                await this.clients.mysql.end();
            }

            this.clients.mysql = await mysql.createConnection(config);
            await this.clients.mysql.ping();
            
            this.connections.mysql = {
                status: 'connected',
                error: null,
                lastCheck: dayjs().format(),
                responseTime: Date.now() - startTime
            };

        } catch (error) {
            this.connections.mysql = {
                status: 'error',
                error: error.message,
                lastCheck: dayjs().format(),
                responseTime: Date.now() - startTime
            };
        }
    }

    async testMongodbConnection() {
        const startTime = Date.now();
        try {
            const host = process.env.MONGO_HOST;
            const port = process.env.MONGO_PORT || 27017;
            const user = process.env.MONGO_USER;
            const password = process.env.MONGO_PASSWORD;
            const database = process.env.MONGO_DATABASE || 'test';

            let uri = `mongodb://${host}:${port}/${database}`;
            if (user && password) {
                uri = `mongodb://${user}:${password}@${host}:${port}/${database}`;
            }

            if (this.clients.mongodb) {
                await this.clients.mongodb.close();
            }

            const clientOptions = {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            };

            // Add SSL/TLS support if flag is set
            if (process.env.MONGO_SSL === 'true') {
                clientOptions.ssl = true;
                clientOptions.sslValidate = process.env.MONGO_SSL_VALIDATE !== 'false';
            }

            this.clients.mongodb = new MongoClient(uri, clientOptions);

            await this.clients.mongodb.connect();
            await this.clients.mongodb.db().admin().ping();

            this.connections.mongodb = {
                status: 'connected',
                error: null,
                lastCheck: dayjs().format(),
                responseTime: Date.now() - startTime
            };

        } catch (error) {
            this.connections.mongodb = {
                status: 'error',
                error: error.message,
                lastCheck: dayjs().format(),
                responseTime: Date.now() - startTime
            };
        }
    }

    async testRedisConnection() {
        const startTime = Date.now();
        try {
            const config = {
                socket: {
                    host: process.env.REDIS_HOST,
                    port: process.env.REDIS_PORT || 6379,
                    connectTimeout: 5000
                }
            };

            if (process.env.REDIS_PASSWORD) {
                config.password = process.env.REDIS_PASSWORD;
            }

            // Add SSL/TLS support if flag is set
            if (process.env.REDIS_SSL === 'true') {
                config.socket.tls = true;
                config.socket.rejectUnauthorized = process.env.REDIS_SSL_REJECT_UNAUTHORIZED !== 'false';
            }

            if (this.clients.redis) {
                await this.clients.redis.disconnect();
            }

            this.clients.redis = createClient(config);
            
            this.clients.redis.on('error', (err) => {
                this.connections.redis = {
                    status: 'error',
                    error: err.message,
                    lastCheck: dayjs().format(),
                    responseTime: Date.now() - startTime
                };
            });

            await this.clients.redis.connect();
            await this.clients.redis.ping();

            this.connections.redis = {
                status: 'connected',
                error: null,
                lastCheck: dayjs().format(),
                responseTime: Date.now() - startTime
            };

        } catch (error) {
            this.connections.redis = {
                status: 'error',
                error: error.message,
                lastCheck: dayjs().format(),
                responseTime: Date.now() - startTime
            };
        }
    }

    startPeriodicChecks() {
        setInterval(() => {
            if (this.shouldTestMysql()) {
                this.testMysqlConnection();
            }
            if (this.shouldTestMongodb()) {
                this.testMongodbConnection();
            }
            if (this.shouldTestRedis()) {
                this.testRedisConnection();
            }
        }, 30000);
    }

    getConnectionStatus() {
        return this.connections;
    }

    getFormattedStatus() {
        const formatConnection = (name, conn) => {
            let statusText = '';
            let colorClass = '';
            
            switch (conn.status) {
                case 'connected':
                    statusText = `CONNECTED (${conn.responseTime}ms)`;
                    colorClass = 'status-connected';
                    break;
                case 'error':
                    statusText = `FAILED: ${conn.error}`;
                    colorClass = 'status-error';
                    break;
                case 'connecting':
                    statusText = 'CONNECTING...';
                    colorClass = 'status-connecting';
                    break;
                case 'not_configured':
                    return null;
            }

            return `<strong>${name.toUpperCase()}:</strong> <span class="${colorClass}">${statusText}</span>${conn.lastCheck ? ` (${conn.lastCheck})` : ''}`;
        };

        const connections = [
            formatConnection('MySQL', this.connections.mysql),
            formatConnection('MongoDB', this.connections.mongodb),
            formatConnection('Redis', this.connections.redis)
        ].filter(conn => conn !== null);

        return connections.length > 0 ? connections.join('\n') : null;
    }

    async cleanup() {
        try {
            if (this.clients.mysql) {
                await this.clients.mysql.end();
            }
            if (this.clients.mongodb) {
                await this.clients.mongodb.close();
            }
            if (this.clients.redis) {
                await this.clients.redis.disconnect();
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

module.exports = DatabaseTester;