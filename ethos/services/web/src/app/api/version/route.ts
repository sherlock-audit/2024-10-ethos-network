import { getAppVersion } from '../../../config';

/**
 * @description
 * An API route that returns the current app version.
 * This is used to check for app version updates and trigger a page reload if necessary.
 * This is to ensure that tanstack query cache busting is enforced when we deploy a new version of the app.
 */
export async function GET() {
  return Response.json({ version: getAppVersion() });
}
