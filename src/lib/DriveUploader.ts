import path from "path";
import fs from "fs-extra";
import { google, drive_v3 } from "googleapis";

import { authScopes } from "../config/drive-uploader";
import { GoogleAuthenticator } from "./GoogleAuthenticator";

type Args = {
  reporter: any;
  appStoragePath: string;
  credentialsPath: string;
  folderIds: any[];
};

const DriveMimeType = {
  Folder: "application/vnd.google-apps.folder",
  PDF: "application/pdf",
};

export class DriveUploader {
  protected drive: drive_v3.Drive;
  protected readonly reporter: Args["reporter"];
  protected readonly folderIds: Record<"agua" | "endesa", string>;
  protected readonly authenticator: GoogleAuthenticator;

  constructor(args: Args) {
    this.reporter = args.reporter;
    this.folderIds = {
      // todo fix me, i look super ugly :(
      agua: args.folderIds.find((i) => typeof i.agua !== "undefined").agua,
      endesa: args.folderIds.find((i) => typeof i.endesa !== "undefined")
        .endesa,
    };

    const credentials = fs.readJSONSync(args.credentialsPath);
    this.authenticator = new GoogleAuthenticator({
      scopes: authScopes,
      reporter: args.reporter,
      appCredentials: credentials,
      appStoragePath: args.appStoragePath,
    });
  }

  async init(): Promise<void> {
    this.print("Initializing drive uploader...");

    this.print("Waiting for auth client...");
    await this.authenticator.waitForAuthentication;
    this.print("Auth client ready...");

    this.drive = google.drive({
      auth: this.authenticator.oAuth2Client,
      version: "v3",
    });
    this.print("Initialized drive uploader...");
  }

  async upload(rootDir: string): Promise<void> {
    if (!this.drive) {
      await this.init();
    }

    this.reporter.printStep(
      1,
      2,
      "Uploading Endesa invoices",
      ":zap:",
      "before"
    );
    await this.uploadEndesa(rootDir);

    this.reporter.printStep(
      2,
      2,
      "Uploading Agua invoices",
      ":droplet:",
      "before"
    );
    await this.uploadAgua(rootDir);
  }

  private async uploadAgua(rootDir: string) {
    const invoicesDir = path.join(rootDir, "agua");

    if (await fs.pathExists(invoicesDir)) {
      this.print("Starting upload...");
      return this.uploadInvoices(invoicesDir, this.folderIds.agua);
    }

    this.print("Directory for agua not found...");
  }

  private async uploadEndesa(rootDir: string) {
    const invoicesDir = path.join(rootDir, "endesa");

    if (await fs.pathExists(invoicesDir)) {
      this.print("Starting upload...");
      return this.uploadInvoices(invoicesDir, this.folderIds.endesa);
    }

    this.print("Directory for endesa not found, skipping...", "warn");
  }

  private async uploadInvoices(rootDir: string, folderId: string) {
    let contents = await fs.readdir(rootDir);
    contents = contents.filter((f) => path.extname(f) === ".pdf");

    this.print(`Found ${contents.length} to upload...`);

    for (let i = 0; i < contents.length; i++) {
      const item = contents[i];
      const text = `invoice ${item}...`;
      const spinner = this.reporter.activity();

      spinner.tick(`Uploading ${text}`);

      try {
        await this.createFile(
          item,
          DriveMimeType.PDF,
          fs.createReadStream(path.join(rootDir, item)),
          folderId
        );
        spinner.end();
        this.print(`Uploaded ${text}`, "success");
      } catch (e) {
        spinner.end();
        this.print(`Failed to upload ${text}`, "error");
        this.print(e.message, "log");
      }
    }
  }

  private async createFile(
    name: string,
    mimeType: string,
    body: fs.ReadStream,
    folderId?: string
  ) {
    const result = await this.drive.files.create({
      fields: "*",
      media: { mimeType, body },
      requestBody: { name, parents: folderId ? [folderId] : [] },
    });
    return result.data;
  }

  private async createFolders(
    names: string[],
    parentId: string
  ): Promise<drive_v3.Schema$File[]> {
    let result: drive_v3.Schema$File[] = [];

    for (let i = 0; i < names.length; i++) {
      const current = names[i];
      result = result.concat(await this.createFolder(current, parentId));
    }

    return result;
  }

  private async listFolderContents() {
    const response = await this.drive.files.list({
      q: `(trashed=false and name='Test') and mimeType='${DriveMimeType.Folder}'`,
      fields: "files(id,name,parents),nextPageToken",
      pageSize: 20,
    });

    this.reporter.log(JSON.stringify(response.data, null, 4));
  }

  private async createFolder(name: string, parentFolderId: string) {
    this.print(`Creating ${this.reporter.colors.green(name)} folder in drive`);
    const response = await this.drive.files.create({
      fields: "*",
      requestBody: {
        name,
        parents: parentFolderId ? [parentFolderId] : [],
        mimeType: DriveMimeType.Folder,
      },
    });

    return response.data;
  }

  private print(
    msg: string,
    type: "info" | "warn" | "error" | "success" | "log" = "info"
  ): void {
    this.reporter[type](msg);
  }
}
