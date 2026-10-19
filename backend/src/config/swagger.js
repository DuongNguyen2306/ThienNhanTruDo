/**
 * Swagger/OpenAPI Configuration for Thiên Nhãn Backend
 * Only enabled in development environment
 */

const swaggerJsdoc = require('swagger-jsdoc');

const swaggerJsdoc = require('swagger-jsdoc');

// Dynamic servers based on environment
const isProduction = process.env.NODE_ENV === 'production';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Thiên Nhãn Trú Đồ API',
      version: '1.0.0',
      description: 'Backend API cho nền tảng thuê phòng minh bạch tại Việt Nam',
      contact: {
        name: 'Thiên Nhãn Team',
      },
    },
    servers: [
      {
        url: 'https://thiennhantrudo-be.onrender.com',
        description: '🚀 Production Server (Render)',
      },
      {
        url: 'http://localhost:3001',
        description: '💻 Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token được trả về từ /api/auth/login. Dán token vào đây (không cần prefix "Bearer ")',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Thông báo lỗi',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            phone: { type: 'string' },
            email: { type: 'string', nullable: true },
            fullName: { type: 'string' },
            role: {
              type: 'string',
              enum: ['tenant', 'seller', 'manager', 'admin'],
            },
            initials: { type: 'string' },
            title: { type: 'string' },
          },
        },
        SellerProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            idNumber: { type: 'string', nullable: true },
            brand: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
            docs: { type: 'array', items: { type: 'string' }, nullable: true },
            status: {
              type: 'string',
              enum: ['none', 'pending', 'active', 'rejected'],
            },
            trustScore: { type: 'number', nullable: true },
            responseRate: { type: 'number', nullable: true },
          },
        },
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sellerId: { type: 'string' },
            title: { type: 'string' },
            roomType: {
              type: 'string',
              enum: ['phong-tro', 'chung-cu-mini', 'nha-tro', 'can-ho'],
            },
            houseNumber: { type: 'string', nullable: true },
            alley: { type: 'string', nullable: true },
            street: { type: 'string', nullable: true },
            ward: { type: 'string', nullable: true },
            district: { type: 'string', nullable: true },
            city: { type: 'string' },
            rent: { type: 'number' },
            depositMonths: { type: 'number' },
            electricity: { type: 'number', nullable: true },
            water: { type: 'number', nullable: true },
            internet: { type: 'number', nullable: true },
            managementFee: { type: 'number', nullable: true },
            area: { type: 'number', nullable: true },
            furniture: { type: 'boolean' },
            pets: { type: 'boolean' },
            vacantNow: { type: 'boolean' },
            verified: { type: 'boolean' },
            vip: { type: 'boolean' },
            highTrust: { type: 'boolean' },
            status: {
              type: 'string',
              enum: ['draft', 'pending', 'active', 'rejected', 'inactive'],
            },
            views: { type: 'number' },
            rating: { type: 'number', nullable: true },
            reviewCount: { type: 'number' },
            photos: { type: 'array', items: { type: 'string' } },
            amenities: { type: 'array', items: { type: 'string' } },
            seller: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                fullName: { type: 'string' },
                phone: { type: 'string' },
                sellerProfile: {
                  type: 'object',
                  properties: {
                    trustScore: { type: 'number' },
                    responseRate: { type: 'number' },
                    verified: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Xác thực & Đăng nhập' },
      { name: 'Listings', description: 'Tin đăng (Public)' },
      { name: 'Seller', description: 'Quản lý tin đăng (Seller)' },
      { name: 'Tenant', description: 'Người thuê' },
      { name: 'Manager', description: 'Quản lý & Duyệt tin (Manager)' },
      { name: 'Admin', description: 'Quản trị hệ thống (Admin)' },
      { name: 'Payment', description: 'Thanh toán VNPay' },
    ],
  },
  apis: [], // We'll inline the paths
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
