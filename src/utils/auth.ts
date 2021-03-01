import url from "url";
import open from "open";
import http from "http";
import { google, Auth } from "googleapis";
import destroyer from "server-destroy";

export type AppCredentials = {
  web: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
};

const port = 6001;
const serverUrl = `http://localhost:${port}`;
const OAuth2Client = google.auth.OAuth2;
const authScopes = ["https://www.googleapis.com/auth/drive.file"];

export const authenticateWithHttpServer = (
  authorizeUrl: string
): Promise<string> =>
  new Promise((resolve, reject) => {
    // on server start, open the browser
    const handleOnListen = () => {
      open(authorizeUrl, { wait: false }).then((cp) => cp.unref());
    };

    // on request, check if have the code
    const handleRequest = async (
      req: http.IncomingMessage,
      res: http.ServerResponse
    ) => {
      try {
        if (req.url && req.url.indexOf("/oauth/callback") > -1) {
          const { searchParams } = new url.URL(req.url, serverUrl);
          const code = searchParams.get("code") as string;

          res.end("Authentication successful! Please return to the console.");
          server.destroy();

          resolve(code);
        }
      } catch (e) {
        reject(e);
      }
    };

    // initialize the server
    const server = http
      .createServer((req, res) => handleRequest(req, res))
      .listen(port, () => handleOnListen());

    // add destroyer
    destroyer(server);
  });
