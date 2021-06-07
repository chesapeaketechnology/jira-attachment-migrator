const fetch = require("node-fetch");
const HttpUtils = require("./httpUtils.js");
const fs = require("fs");
const FormData = require("form-data");

class TargetJiraApi {
  constructor(jiraSettings) {
    this.jiraSettings = jiraSettings;
    this.currentTestCaseIndex = 0;
    this.currentPage = 0;
    this.firstPageLoaded = false;
    this.pageSize = 200;
  }

  getIssueKey(testCase) {
    if (!testCase.customFields) {
      return;
    }
    return testCase.customFields[this.jiraSettings.issueKeyCustomField];
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

  async getNextTestCase() {
    if (!this.testCases) {
      await this._loadNextTestCasePage();
    }

    if (this.currentTestCaseIndex >= this.testCases.length) {
      let isEof = await this._loadNextTestCasePage();
      if (isEof) {
        return;
      }
      this.currentTestCaseIndex = 0;
    }

    const testCase = this.testCases[this.currentTestCaseIndex];
    this.currentTestCaseIndex++;
    return testCase;
  }

  async uploadAttachments(issueKey) {
    const attachmentsDir = `./attachments/${issueKey}`;
    const files = fs.readdirSync(attachmentsDir);
    const formData = new FormData();

    for (let file of files) {
      var filePath = `${attachmentsDir}/${file}`;
      formData.append("file", fs.createReadStream(filePath));
    }

    // In order to protect against XSRF attacks, because this method accepts multipart/form-data, it has XSRF protection on it.
    // This means you must submit a header of X-Atlassian-Token: no-check with the request, otherwise it will be blocked.
    const reqHeadersObj = {
      method: "POST",
      body: formData,
      headers: formData.getHeaders({ "X-Atlassian-Token": "no-check" }),
    };

    const authHeader = HttpUtils.getAuthHeader(
      this.jiraSettings.user,
      this.jiraSettings.password
    );
    reqHeadersObj.headers.Authorization = authHeader.headers.Authorization;

    const response = await fetch(_getAttachmentsUrl(issueKey), reqHeadersObj);
    const isError = "errorMessages" in response;
    if (isError) {
      console.log(await response.text());
      throw `Error uploading attachment ${filePath} to test case ${issueKey}`;
    }
  }

  async _loadNextTestCasePage() {
    if (this.testCases) {
      this.currentPage++;
    }
    if (this.testCases && this.testCases.length < this.pageSize) return true;
    await this._loadPage(this.currentPage);
    return this.testCases.length === 0;
  }

  async _loadPage() {
    var query = `project = ${this.jiraSettings.projectKey}`;
    if (
      this.jiraSettings.issueKeyStart != null &&
      this.jiraSettings.issueKeyEnd != null
    ) {
      query += ` AND (issuekey >= ${this.jiraSettings.issueKeyStart} AND issuekey <= ${this.jiraSettings.issueKeyEnd})`;
    }

    const searchParams = {
      jql: query,
      startAt: this.pageSize * this.currentPage,
      maxResults: this.pageSize,
    };

    const reqHeadersObj = {
      method: "POST",
      body: JSON.stringify(searchParams),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    const authHeader = HttpUtils.getAuthHeader(
      this.jiraSettings.user,
      this.jiraSettings.password
    );

    reqHeadersObj.headers.Authorization = authHeader.headers.Authorization;

    const response = await fetch(this._getTestCaseSearchUrl(), reqHeadersObj);

    const isValid = response.status == 200;
    if (!isValid) {
      console.log(await response.text());
      throw "Error retrieving test cases";
    }
    this.testCases = (await response.json()).issues;
  }

  _getMyselfUrl() {
    return `${this.jiraSettings.url}/rest/api/2/myself`;
  }

  _getAttachmentsUrl(issueKey) {
    return `${this.jiraSettings.url}/rest/api/2/issue/${issueKey}/attachments`;
  }

  _getTestCaseSearchUrl() {
    return `${this.jiraSettings.url}/rest/api/2/search`;
  }
}

module.exports = TargetJiraApi;
