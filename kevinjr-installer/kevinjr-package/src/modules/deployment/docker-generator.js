/**
 * KevinJr Docker Generator
 * Multi-stage Docker builds and optimization
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

class DockerGenerator {
  constructor(config = {}) {
    this.config = config;
    this.logger = null;
    
    // Docker templates for different frameworks
    this.templates = {
      node: {
        base: 'node:18-alpine',
        workdir: '/app',
        port: 3000,
        healthcheck: '/health'
      },
      python: {
        base: 'python:3.11-alpine',
        workdir: '/app',
        port: 8000,
        healthcheck: '/health'
      },
      go: {
        base: 'golang:1.21-alpine',
        workdir: '/app',
        port: 8080,
        healthcheck: '/health'
      },
      rust: {
        base: 'rust:1.75-alpine',
        workdir: '/app',
        port: 8000,
        healthcheck: '/health'
      }
    };
    
    this._setupLogger();
  }

  async initialize() {
    this.logger.info('🐳 Docker Generator initializing...');
    this.logger.info('✅ Docker Generator ready');
    return true;
  }

  async generateDockerfiles(params) {
    const {
      projectPath,
      framework = 'node',
      optimize = true,
      multiStage = true,
      baseImage
    } = params;

    this.logger.info(`🐳 Generating Dockerfile for ${framework} project`);

    try {
      const template = this.templates[framework];
      if (!template) {
        throw new Error(`Unsupported framework: ${framework}`);
      }

      // Generate main Dockerfile
      const dockerfile = await this._generateDockerfile(framework, template, {
        optimize,
        multiStage,
        baseImage
      });

      // Generate docker-compose.yml
      const dockerCompose = await this._generateDockerCompose(framework, template);

      // Generate .dockerignore
      const dockerignore = await this._generateDockerignore(framework);

      // Write files
      await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);
      await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), dockerCompose);
      await fs.writeFile(path.join(projectPath, '.dockerignore'), dockerignore);

      return {
        success: true,
        message: `Docker configuration generated for ${framework}`,
        files: ['Dockerfile', 'docker-compose.yml', '.dockerignore'],
        framework,
        optimized: optimize,
        multiStage
      };

    } catch (error) {
      this.logger.error(`💥 Docker generation failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deploy(params) {
    const { projectPath, environment, config } = params;

    this.logger.info(`🚀 Deploying Docker container from: ${projectPath}`);

    // Implementation placeholder - will be completed in next steps
    return {
      success: true,
      message: `Docker deployment from ${projectPath} ready`,
      environment,
      placeholder: true
    };
  }

  async healthCheck() {
    return {
      healthy: true,
      generator: 'docker',
      supportedFrameworks: Object.keys(this.templates)
    };
  }

  async cleanup() {
    this.logger.info('🧹 Docker Generator cleanup...');
    this.logger.info('✅ Docker Generator cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [DockerGen] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _generateDockerfile(framework, template, options) {
    const { optimize, multiStage, baseImage } = options;
    const base = baseImage || template.base;

    if (multiStage && framework === 'node') {
      return this._generateMultiStageNodeDockerfile(base, template, optimize);
    } else if (multiStage && framework === 'python') {
      return this._generateMultiStagePythonDockerfile(base, template, optimize);
    } else if (multiStage && framework === 'go') {
      return this._generateMultiStageGoDockerfile(base, template, optimize);
    } else {
      return this._generateSingleStageDockerfile(framework, base, template, optimize);
    }
  }

  _generateMultiStageNodeDockerfile(base, template, optimize) {
    return `# Multi-stage build for Node.js application
# Build stage
FROM ${base} AS builder

WORKDIR ${template.workdir}

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM ${base} AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nextjs -u 1001

WORKDIR ${template.workdir}

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs ${template.workdir}/dist ./dist
COPY --from=builder --chown=nextjs:nodejs ${template.workdir}/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE ${template.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${template.port}${template.healthcheck} || exit 1

# Start the application
CMD ["npm", "start"]`;
  }

  _generateMultiStagePythonDockerfile(base, template, optimize) {
    return `# Multi-stage build for Python application
# Build stage
FROM ${base} AS builder

WORKDIR ${template.workdir}

# Install system dependencies
RUN apk add --no-cache gcc musl-dev libffi-dev

# Copy requirements
COPY requirements*.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM ${base} AS production

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR ${template.workdir}

# Copy Python dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Make sure scripts in .local are usable
ENV PATH=/home/appuser/.local/bin:$PATH

# Expose port
EXPOSE ${template.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${template.port}${template.healthcheck} || exit 1

# Start the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${template.port}"]`;
  }

  _generateMultiStageGoDockerfile(base, template, optimize) {
    return `# Multi-stage build for Go application
# Build stage
FROM ${base} AS builder

WORKDIR ${template.workdir}

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest AS production

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates curl

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder ${template.workdir}/main .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE ${template.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${template.port}${template.healthcheck} || exit 1

# Start the application
CMD ["./main"]`;
  }

  _generateSingleStageDockerfile(framework, base, template, optimize) {
    const optimizations = optimize ? this._getOptimizations(framework) : '';

    return `# Single-stage build for ${framework} application
FROM ${base}

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR ${template.workdir}

${optimizations}

# Copy application files
COPY --chown=appuser:appgroup . .

# Install dependencies
${this._getInstallCommand(framework)}

# Switch to non-root user
USER appuser

# Expose port
EXPOSE ${template.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${template.port}${template.healthcheck} || exit 1

# Start the application
CMD ${this._getStartCommand(framework)}`;
  }

  async _generateDockerCompose(framework, template) {
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "${template.port}:${template.port}"
    environment:
      - NODE_ENV=production
      - PORT=${template.port}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - database
      - redis

  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: bridge`;
  }

  async _generateDockerignore(framework) {
    const common = `# Common files to ignore
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.yarn-integrity

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage
*.lcov

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Git
.git
.gitignore
README.md

# Docker
Dockerfile
.dockerignore
docker-compose*.yml

# Testing
coverage/
.nyc_output/
test/
tests/
spec/
__tests__/

# Build artifacts
dist/
build/
out/
.next/
.nuxt/
.cache/`;

    const frameworkSpecific = {
      python: `
# Python specific
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
env.bak/
venv.bak/
.pytest_cache/
.coverage
htmlcov/
.tox/
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/`,
      
      go: `
# Go specific
*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
*.out
vendor/
go.work
go.work.sum`,
      
      rust: `
# Rust specific
target/
Cargo.lock
**/*.rs.bk`
    };

    return common + (frameworkSpecific[framework] || '');
  }

  _getOptimizations(framework) {
    const optimizations = {
      node: `# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force`,
      
      python: `# Install system dependencies and curl
RUN apk add --no-cache curl gcc musl-dev libffi-dev

# Copy requirements first for better caching
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt`,
      
      go: `# Install curl for health checks
RUN apk add --no-cache curl ca-certificates

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download`,
      
      rust: `# Install curl and build dependencies
RUN apk add --no-cache curl gcc musl-dev

# Copy Cargo files first for better caching
COPY Cargo.toml Cargo.lock ./
RUN cargo fetch`
    };

    return optimizations[framework] || '';
  }

  _getInstallCommand(framework) {
    const commands = {
      node: 'RUN npm ci --only=production',
      python: 'RUN pip install --no-cache-dir -r requirements.txt',
      go: 'RUN go build -o main .',
      rust: 'RUN cargo build --release'
    };

    return commands[framework] || 'RUN echo "No install command defined"';
  }

  _getStartCommand(framework) {
    const commands = {
      node: '["npm", "start"]',
      python: '["python", "main.py"]',
      go: '["./main"]',
      rust: '["./target/release/app"]'
    };

    return commands[framework] || '["echo", "No start command defined"]';
  }
}

module.exports = DockerGenerator;

