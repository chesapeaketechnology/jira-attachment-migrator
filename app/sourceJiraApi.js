const fetch = require("node-fetch");
const HttpUtils = require("./httpUtils.js");
const fs = require("fs");

class SourceJiraApi {
  constructor(jiraSettings) {
    this.jiraSettings = jiraSettings;
  }

  async getAttachments(issueKey) {
    const response = await fetch(
      this._getIssueUrl(issueKey),
      HttpUtils.getAuthHeader(
        this.jiraSettings.user,
        this.jiraSettings.password
      )
    );
    const isValid = response.status == 200;
    if (!isValid) {
      console.log(await response.text());
      throw `Error retrieving issue atachments. Issue key: ${issueKey}`;
    }
    let issue = await response.json();
    return issue.fields.attachment;
  }

  async downloadAttachments(issueKey, attachments) {
    const attachmentsDir = `./attachments/${issueKey}`;
    if (fs.existsSync(attachmentsDir)) {
      // attachments had already been downloaded, no need to download again
      return;
    }
    fs.mkdirSync(attachmentsDir);

    for (let attachment of attachments) {
      await this._downloadAttachment(attachment, attachmentsDir);
    }
  }

  async validate() {
    const response = await fetch(
      this._getMyselfUrl(),
      HttpUtils.getAuthHeader(
        this.jiraSettings.user,
        this.jiraSettings.password
      )
    );
    const isValid = response.status == 200;
    if (!isValid) {
      console.log(await response.text());
    }
    return isValid;
  }

  _getMyselfUrl() {
    return `${this.jiraSettings.url}/rest/api/2/myself`;
  }

  _getIssueUrl(issueKey) {
    return `${this.jiraSettings.url}/rest/api/2/issue/${issueKey}?fields=attachment`;
  }

  async _downloadAttachment(attachment, attachmentsDir) {
    const response = await fetch(
      attachment.content,
      HttpUtils.getAuthHeader(
        this.jiraSettings.user,
        this.jiraSettings.password
      )
    );

    await new Promise((resolve, reject) => {
      const dest = fs.createWriteStream(
        `${attachmentsDir}/${attachment.filename}`
      );
      response.body.pipe(dest);
      response.body.on("error", (err) => {
        reject(err);
      });
      dest.on("finish", () => {
        resolve();
      });
      dest.on("error", (err) => {
        reject(err);
      });
    });
  }
}

module.exports = SourceJiraApi;
