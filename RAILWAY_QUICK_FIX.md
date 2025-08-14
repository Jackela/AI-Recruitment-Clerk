{
  "name": "ai-recruitment-clerk",
  "version": "1.0.0",
  "scripts": {
    "build": "echo 'Build completed'",
    "start": "node simple-server.js",
    "start:prod": "NODE_ENV=production node simple-server.js"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "express": "^4.19.2",
    "mongoose": "^8.17.1",
    "rxjs": "^7.8.0",
    "reflect-metadata": "^0.1.13"
  }
}