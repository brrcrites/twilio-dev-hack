# SMS Test

This repository is designed to test sending an sms message from twilio through a react app.

## Toolchain

- npm
- js/react
- babel
- webpack
- docker

## Execution

The very first time you try and run the project

```
npm install
```

Each time you make a change

```
npm run build
```

To run the development server

```
npm run start
```

> Note: for now you need to go to `localhost:8080/build` to get to the project

## Docker Execution

There is also a docker container for running the dev server. To build the container

```
docker build . -t sms-test:latest
```

To run the container

```
docker run -p 8080:8080 sms-test
```

> Note: for now you need to go to `localhost:8080/build` to get to the projeect