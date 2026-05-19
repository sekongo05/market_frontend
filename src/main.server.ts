import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { config } from './app/app.config.server';
import { mergeApplicationConfig } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr);

const serverConfig = mergeApplicationConfig(appConfig, config);

const bootstrap = () => bootstrapApplication(App, serverConfig);

export default bootstrap;
