# Performance tests

## Setting up K6 locally
1. Install k6 by following the instructions [here](https://grafana.com/docs/k6/latest/set-up/install-k6/).
2. Retrieve the ethosnetwork cloud API key [here](https://ethosnetwork.grafana.net/a/k6-app/settings/api-token)
3. Login to k6 cloud with the following command:
    ```bash
    k6 cloud login
    ```
4. Open the `k6` directory in the terminal and run the following command to run the performance test:
    ```bash
    npm run start
    ```
    or
    ```bash
    npx webpack && k6 cloud -e test_mode=load dist/api.tests.js
    ```
4. You can see the test results in the terminal and also in the k6 cloud dashboard [here](https://ethosnetwork.grafana.net/a/k6-app/projects/3711730)

### Running the performance tests on github server actions
To run the performance tests on github server actions, navigate to actions and select "Performance tests" from the menu on the left.
Press the "Run workflow" button to run the performance tests and select the branch you want to run the tests on along with the test type.

### Running the performance tests locally
You can either run the tests locally or in the cloud. Note: local tests will still target the default `baseUrl` (see `config.ts`), which is not localhost. Change the `baseUrl` in the `config.ts` file to `http://localhost:8080/api` to run the tests against the local echo API.

To run the tests locally, simply use `npm run dev` which executes `k6 run` instead of `k6 cloud` in the above command.

Use `npm run publish` to run the tests locally and publish the results in the cloud.

## Environment variables & types of tests
The following environment variables `-e` can be set to run different types of tests:
- `test_mode`: The type of test to run. The possible values are `smoke`, `load`, `stress` and `soak`.

### Test mode configuration
Test modes can be configured by editing the `config/config.ts` file and modifying the `testTypes` property.
