import { echoClient, setEchoConfig } from '@ethos/echo-client';
import { getEchoBaseUrl } from 'config/misc';

setEchoConfig({
  baseUrl: getEchoBaseUrl(),
  ethosService: 'web',
});

export const echoApi = echoClient;
