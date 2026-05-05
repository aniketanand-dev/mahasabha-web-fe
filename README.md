# VeerashivaMahasabha

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.0-rc.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

The app uses relative `/api` and `/uploads` paths. During local development, Angular proxies those requests to `http://localhost:5000` using `proxy.conf.json`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Nginx Deployment

For production, serve the Angular build and proxy backend requests through the same Nginx host.

- Serve `dist/veerashiva-mahasabha/browser`
- Proxy `/api/` to the backend Node process on `http://127.0.0.1:5000`
- Proxy `/uploads/` to the same backend so images stay same-origin

Example config is available in `nginx.conf.example`.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
