import path from "path";
import fs from "fs-extra";
import { google, Auth } from "googleapis";

import { authenticateWithHttpServer, AppCredentials } from "../utils/auth";

type Args = {
  scopes: string[];
  appCredentials: AppCredentials;
  appStoragePath: string;
  reporter: any;
};

const userCredentialsFile = "creds.json";
const OAuth2Client = google.auth.OAuth2;

export class GoogleAuthenticator {
  oAuth2Client: Auth.OAuth2Client;

  protected readonly reporter: any;
  protected readonly scopes: string[];
  protected readonly appStoragePath: string;
  protected readonly userCredentialsPath: string;

  readonly waitForAuthentication: Promise<void>;

  constructor(args: Args) {
    this.scopes = args.scopes;
    this.reporter = args.reporter;
    this.appStoragePath = args.appStoragePath;
    this.userCredentialsPath = path.join(
      this.appStoragePath,
      userCredentialsFile
    );

    this.waitForAuthentication = this.setOAuthClient(args.appCredentials);
  }

  private async setOAuthClient(appCredentials: AppCredentials) {
    this.oAuth2Client = await this.getAuthenticatedClient(appCredentials);
  }

  private async getAuthenticatedClient(
    appCredentials: AppCredentials
  ): Promise<Auth.OAuth2Client> {
    const oAuth2Client = new OAuth2Client({
      clientId: appCredentials.web.client_id,
      clientSecret: appCredentials.web.client_secret,
      redirectUri: appCredentials.web.redirect_uris[0],
    });

    let credentials = await this.getSavedUserCredentials();

    if (credentials && credentials.access_token) {
      this.print("Found saved credentials...");
    } else {
      this.print("No saved credentials found", "warn");
      const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: this.scopes,
      });

      this.print("Waiting for browser authentication to be finished...");
      const code = await authenticateWithHttpServer(authorizeUrl);
      const response = await oAuth2Client.getToken(code);

      credentials = response.tokens;
      await this.saveUserCredentials(credentials);
    }

    oAuth2Client.setCredentials(credentials);

    // if token is expired, get new ones
    if (new Date() >= new Date(credentials.expiry_date as number)) {
      this.print("Current token is expired", "warn");
      this.print("Refreshing token...");
      // todo
      // at this moment this depricated method works fine.
      // should be replaced with the new api in future.
      const response = await oAuth2Client.refreshAccessToken();
      await this.saveUserCredentials(response.credentials);
      oAuth2Client.setCredentials(response.credentials);
    }

    return oAuth2Client;
  }

  private async getSavedUserCredentials(): Promise<null | Auth.Credentials> {
    if (!(await fs.pathExists(this.userCredentialsPath))) {
      return null;
    }
    return fs.readJSON(this.userCredentialsPath);
  }

  private async saveUserCredentials(tokens: Auth.Credentials): Promise<void> {
    await fs.outputJSON(this.userCredentialsPath, tokens);
    this.reporter.printWithFilepath(
      "Saved credentials at:",
      this.userCredentialsPath
    );
  }

  async getAccessToken() {}

  private print(
    msg: string,
    type: "info" | "warn" | "error" | "success" | "log" = "info"
  ): void {
    this.reporter[type](msg);
  }
}
