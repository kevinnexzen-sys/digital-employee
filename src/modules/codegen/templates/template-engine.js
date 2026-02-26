/**
 * KevinJr Template Engine
 * Smart template management and rendering
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const Handlebars = require('handlebars');

class TemplateEngine {
  constructor(config = {}) {
    this.config = config;
    this.logger = null;
    this.templates = new Map();
    this.partials = new Map();
    
    // Built-in templates
    this.builtInTemplates = {
      'react-component': {
        name: 'React Component',
        description: 'Modern React functional component with hooks',
        language: 'javascript',
        framework: 'react'
      },
      'express-api': {
        name: 'Express API',
        description: 'RESTful API with Express.js',
        language: 'javascript',
        framework: 'express'
      },
      'fastapi-service': {
        name: 'FastAPI Service',
        description: 'Python FastAPI microservice',
        language: 'python',
        framework: 'fastapi'
      },
      'docker-config': {
        name: 'Docker Configuration',
        description: 'Multi-stage Docker build configuration',
        language: 'dockerfile',
        framework: 'docker'
      }
    };
    
    this._setupLogger();
  }

  async initialize() {
    this.logger.info('📝 Template Engine initializing...');
    
    // Load built-in templates
    await this._loadBuiltInTemplates();
    
    // Load custom templates if configured
    if (this.config.customTemplatesPath) {
      await this._loadCustomTemplates(this.config.customTemplatesPath);
    }
    
    // Register Handlebars helpers
    this._registerHelpers();
    
    this.logger.info(`✅ Template Engine ready with ${this.templates.size} templates`);
    return true;
  }

  async render(templateName, data = {}) {
    this.logger.info(`📝 Rendering template: ${templateName}`);
    
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }
      
      const compiledTemplate = Handlebars.compile(template.content);
      const rendered = compiledTemplate(data);
      
      return {
        success: true,
        content: rendered,
        template: templateName,
        data
      };
      
    } catch (error) {
      this.logger.error(`💥 Template rendering failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        template: templateName
      };
    }
  }

  getAvailableTemplates() {
    const templates = {};
    
    for (const [name, template] of this.templates) {
      templates[name] = {
        name: template.name,
        description: template.description,
        language: template.language,
        framework: template.framework,
        variables: template.variables || []
      };
    }
    
    return templates;
  }

  async addTemplate(name, templateData) {
    this.logger.info(`📝 Adding template: ${name}`);
    
    try {
      this.templates.set(name, {
        name: templateData.name || name,
        description: templateData.description || '',
        content: templateData.content,
        language: templateData.language || 'text',
        framework: templateData.framework || 'generic',
        variables: templateData.variables || [],
        custom: true
      });
      
      return {
        success: true,
        message: `Template ${name} added successfully`
      };
      
    } catch (error) {
      this.logger.error(`💥 Failed to add template: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async healthCheck() {
    return {
      healthy: true,
      engine: 'handlebars',
      templates: this.templates.size,
      partials: this.partials.size,
      builtInTemplates: Object.keys(this.builtInTemplates).length
    };
  }

  async cleanup() {
    this.logger.info('🧹 Template Engine cleanup...');
    this.templates.clear();
    this.partials.clear();
    this.logger.info('✅ Template Engine cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [TemplateEngine] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _loadBuiltInTemplates() {
    // React Component Template
    this.templates.set('react-component', {
      ...this.builtInTemplates['react-component'],
      content: `import React, { useState, useEffect } from 'react';
{{#if props}}
import PropTypes from 'prop-types';
{{/if}}
{{#if styling}}
import './{{componentName}}.{{styleExt}}';
{{/if}}

const {{componentName}} = ({{#if props}}{ {{#each props}}{{name}}{{#unless @last}}, {{/unless}}{{/each}} }{{/if}}) => {
  {{#if hasState}}
  const [state, setState] = useState({{defaultState}});
  {{/if}}

  {{#if hasEffect}}
  useEffect(() => {
    // Component effect logic
  }, []);
  {{/if}}

  return (
    <div className="{{kebabCase componentName}}">
      <h2>{{componentName}}</h2>
      {{#if props}}
      {{#each props}}
      <p>{{name}}: {{{name}}}</p>
      {{/each}}
      {{/if}}
    </div>
  );
};

{{#if props}}
{{componentName}}.propTypes = {
  {{#each props}}
  {{name}}: PropTypes.{{type}}{{#if required}}.isRequired{{/if}}{{#unless @last}},{{/unless}}
  {{/each}}
};
{{/if}}

export default {{componentName}};`,
      variables: ['componentName', 'props', 'styling', 'hasState', 'hasEffect']
    });

    // Express API Template
    this.templates.set('express-api', {
      ...this.builtInTemplates['express-api'],
      content: `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
{{#if database}}
const {{database}} = require('./config/{{database}}');
{{/if}}

const app = express();
const PORT = process.env.PORT || {{port}};

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

{{#each endpoints}}
// {{description}}
app.{{method}}('{{path}}', async (req, res) => {
  try {
    {{#if requiresAuth}}
    // Authentication check
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    {{/if}}

    {{#if hasValidation}}
    // Input validation
    const { error, value } = validate{{capitalize name}}(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    {{/if}}

    // {{name}} logic
    const result = await {{name}}Service({{#if hasBody}}value || req.body{{else}}req.params{{/if}});
    
    res.status({{successCode}}).json({
      success: true,
      data: result,
      message: '{{successMessage}}'
    });
  } catch (error) {
    console.error('{{name}} error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

{{/each}}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: '{{serviceName}}',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(\`🚀 {{serviceName}} API running on port \${PORT}\`);
  console.log(\`💻 Generated by KevinJr\`);
});

module.exports = app;`,
      variables: ['serviceName', 'port', 'database', 'endpoints']
    });

    // FastAPI Service Template
    this.templates.set('fastapi-service', {
      ...this.builtInTemplates['fastapi-service'],
      content: `from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
{{#if database}}
from .database import get_db
{{/if}}

app = FastAPI(
    title="{{serviceName}}",
    description="{{description}}",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

{{#if requiresAuth}}
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Authentication logic
    token = credentials.credentials
    # Validate token here
    return {"user_id": "example"}
{{/if}}

{{#each models}}
class {{name}}(BaseModel):
    {{#each fields}}
    {{name}}: {{type}}{{#if optional}} = None{{/if}}
    {{/each}}

{{/each}}

{{#each endpoints}}
@app.{{method}}("{{path}}"{{#if response}}, response_model={{response}}{{/if}})
async def {{name}}(
    {{#if hasBody}}{{body_param}}: {{body_type}}{{#if hasAuth}},{{/if}}{{/if}}
    {{#if hasAuth}}current_user: dict = Depends(get_current_user){{/if}}
):
    """{{description}}"""
    try:
        {{#if hasValidation}}
        # Input validation
        if not {{validation_check}}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid input data"
            )
        {{/if}}

        # {{name}} logic
        result = await {{name}}_service({{#if hasBody}}{{body_param}}{{/if}})
        
        return {
            "success": True,
            "data": result,
            "message": "{{successMessage}}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

{{/each}}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "{{serviceName}}",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port={{port}},
        reload=True
    )`,
      variables: ['serviceName', 'description', 'port', 'models', 'endpoints', 'requiresAuth']
    });

    // Docker Configuration Template
    this.templates.set('docker-config', {
      ...this.builtInTemplates['docker-config'],
      content: `# Multi-stage build for {{appName}}
{{#if frontend}}
FROM node:{{nodeVersion}}-alpine AS frontend-build
WORKDIR /app/frontend
COPY {{frontend}}/package*.json ./
RUN npm ci --only=production
COPY {{frontend}}/ ./
RUN npm run build
{{/if}}

FROM node:{{nodeVersion}}-alpine AS backend
WORKDIR /app

# Install dependencies
COPY {{backend}}/package*.json ./
RUN npm ci --only=production

# Copy application code
COPY {{backend}}/ ./
{{#if frontend}}
COPY --from=frontend-build /app/frontend/{{buildDir}} ./{{publicDir}}
{{/if}}

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE {{port}}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:{{port}}/health || exit 1

# Start application
CMD ["npm", "start"]`,
      variables: ['appName', 'nodeVersion', 'frontend', 'backend', 'buildDir', 'publicDir', 'port']
    });
  }

  async _loadCustomTemplates(customPath) {
    try {
      if (await fs.pathExists(customPath)) {
        const files = await fs.readdir(customPath);
        
        for (const file of files) {
          if (file.endsWith('.hbs') || file.endsWith('.handlebars')) {
            const templateName = path.basename(file, path.extname(file));
            const templatePath = path.join(customPath, file);
            const content = await fs.readFile(templatePath, 'utf8');
            
            this.templates.set(templateName, {
              name: templateName,
              description: `Custom template: ${templateName}`,
              content,
              language: 'text',
              framework: 'custom',
              custom: true
            });
          }
        }
        
        this.logger.info(`📝 Loaded ${files.length} custom templates`);
      }
    } catch (error) {
      this.logger.warn(`⚠️ Failed to load custom templates: ${error.message}`);
    }
  }

  _registerHelpers() {
    // Capitalize helper
    Handlebars.registerHelper('capitalize', (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Kebab case helper
    Handlebars.registerHelper('kebabCase', (str) => {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    });

    // Snake case helper
    Handlebars.registerHelper('snakeCase', (str) => {
      return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    });

    // Camel case helper
    Handlebars.registerHelper('camelCase', (str) => {
      return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // JSON helper
    Handlebars.registerHelper('json', (context) => {
      return JSON.stringify(context, null, 2);
    });

    this.logger.info('📝 Handlebars helpers registered');
  }
}

module.exports = TemplateEngine;

