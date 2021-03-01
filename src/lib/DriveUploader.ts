import path from "path";
import fs from "fs-extra";
import { google, drive_v3 } from "googleapis";

import { authScopes } from "../config/drive-uploader";
import { GoogleAuthenticator } from "./GoogleAuthenticator";
import { DuplicateBehaviour } from "../types/DriveUploader";
import { content } from "googleapis/build/src/apis/content";

type Args = {
  reporter: any;
  folderIds: any[];
  appStoragePath: string;
  credentialsPath: string;
  duplicateBehaviour: DuplicateBehaviour;
};

const DriveMimeType = {
  Folder: "application/vnd.google-apps.folder",
  PDF: "application/pdf",
};

export class DriveUploader {
  protected drive: drive_v3.Drive;
  protected readonly reporter: Args["reporter"];
  protected readonly duplicateBehaviour: DuplicateBehaviour;
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
    this.duplicateBehaviour = args.duplicateBehaviour;

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
    this.print(
      `Duplicate behaviour is set to: ${this.reporter.colors.green(
        this.duplicateBehaviour
      )}`
    );
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
      await this.uploadInvoices(invoicesDir, this.folderIds.agua);
      this.print("Upload finished", "success");
    }

    this.print("Directory for agua not found...");
  }

  private async uploadEndesa(rootDir: string) {
    const invoicesDir = path.join(rootDir, "endesa");

    if (await fs.pathExists(invoicesDir)) {
      this.print("Starting upload...");
      await this.uploadInvoices(invoicesDir, this.folderIds.endesa);
      this.print("Upload finished", "success");
    }

    this.print("Directory for endesa not found, skipping...", "warn");
  }

  private async uploadInvoices(rootDir: string, folderId: string) {
    let contents = await fs.readdir(rootDir);
    contents = contents.filter((f) => path.extname(f) === ".pdf");
    const count = {
      uploaded: 0,
      skippedOrUpdated: 0,
      total: contents.length,
    };

    this.print(`Found ${contents.length} invoices to upload...`);

    for (let i = 0; i < contents.length; i++) {
      const name = contents[i];
      const mimeType = DriveMimeType.PDF;
      const text = `invoice ${name}...`;
      const spinner = this.reporter.activity();

      spinner.tick(`Checking if invoice ${name} exists already...`);
      const duplicateFile = await this.findInvoiceFileByName(name, mimeType);

      if (duplicateFile) {
        this.print(`Invoice ${name} aleady exists`);

        if (this.duplicateBehaviour === "update") {
          spinner.tick(`Updating ${text}`);

          await this.updateInvoice(
            duplicateFile.id as string,
            duplicateFile.mimeType as string,
            fs.createReadStream(path.join(rootDir, name))
          );
          this.print(
            `${this.reporter.colors.green("updated")} Invoice ${name}...`,
            "log"
          );
          spinner.end();
          count.skippedOrUpdated++;
          continue;
        }

        spinner.end();
        this.print(
          `${this.reporter.colors.green("skipped")} Invoice ${name}...`,
          "log"
        );
        count.skippedOrUpdated++;
        continue;
      }

      spinner.tick(`Uploading ${text}`);
      await this.uploadInvoice(name, mimeType, rootDir, folderId);
      spinner.end();
      count.uploaded++;
    }

    this.print(
      `${this.duplicateBehaviour === "skip" ? "Skipped" : "Updated"}: ${
        count.skippedOrUpdated
      }, Uploaded: ${count.uploaded}, Total: ${count.total}`
    );
  }

  private async updateInvoice(
    fileId: string,
    mimeType: string,
    body: fs.ReadStream
  ) {
    await this.drive.files.update({
      fileId,
      media: {
        mimeType,
        body,
      },
    });
  }

  private async findInvoiceFileByName(
    name: string,
    mimeType: string
  ): Promise<drive_v3.Schema$File | null> {
    try {
      const result = await this.drive.files.list({
        q: `(trashed=false and name='${name}') and mimeType='${mimeType}'`,
        fields: "files(id,name)",
        pageSize: 4,
      });
      return result.data.files ? result.data.files[0] : null;
    } catch (e) {
      this.print(`Failed to find duplicate for ${name}`, "warn");
      this.print(e.message, "log");
    }
    return null;
  }

  private async uploadInvoice(
    item: string,
    mimeType: string,
    rootDir: string,
    folderId: string
  ) {
    const text = `invoice ${item}...`;

    try {
      await this.createFile(
        item,
        mimeType,
        fs.createReadStream(path.join(rootDir, item)),
        folderId
      );

      this.print(`Uploaded ${text}`, "success");
    } catch (e) {
      this.print(`Failed to upload ${text}`, "error");
      this.print(e.message, "log");
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

  private print(
    msg: string,
    type: "info" | "warn" | "error" | "success" | "log" = "info"
  ): void {
    this.reporter[type](msg);
  }
}
