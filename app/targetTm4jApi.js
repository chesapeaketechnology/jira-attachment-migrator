const fetch = require("node-fetch");
const HttpUtils = require("./httpUtils.js");
const fs = require("fs");
const FormData = require("form-data");

class TargetTM4JApi {
  constructor(jiraSettings) {
    this.jiraSettings = jiraSettings;
    this.currentTestCaseIndex = 0;
    this.currentPage = 0;
    this.firstPageLoaded = false;
    this.pageSize = 200;
    if (this.jiraSettings.issueKeyStart && this.jiraSettings.issueKeyEnd) {
      this.originalIssueKeyStart = this._parseOriginalIssueKey(
        this.jiraSettings.issueKeyStart
      );
      this.originalIssueKeyEnd = this._parseOriginalIssueKey(
        this.jiraSettings.issueKeyEnd
      );
    }
  }

  getIssueKey(testCase) {
    if (!testCase.customFields) {
      return;
    }
    return testCase.customFields[this.jiraSettings.issueKeyCustomField];
  }

  async validate() {
    const response = await fetch(
      this._getTestUrl(),
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

  async uploadAttachments(issueKey, testCaseKey) {
    const attachmentsDir = `./attachments/${issueKey}`;
    const files = fs.readdirSync(attachmentsDir);
    for (let file of files) {
      await this._uploadAttachmentToTestCase(
        testCaseKey,
        `${attachmentsDir}/${file}`
      );
    }
  }

  async _uploadAttachmentToTestCase(testCaseKey, filePath) {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const reqHeadersObj = {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    };

    const authHeader = HttpUtils.getAuthHeader(
      this.jiraSettings.user,
      this.jiraSettings.password
    );
    reqHeadersObj.headers.Authorization = authHeader.headers.Authorization;

    const response = await fetch(
      _getAttachmentsUrl(testCaseKey),
      reqHeadersObj
    );
    const isValid = response.status == 201;
    if (!isValid) {
      console.log(await response.text());
      throw `Error uploading attachment ${filePath} to test case ${testCaseKey}`;
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

  async _loadPage(pageNumber) {
    const response = await fetch(
      this._getTestCaseSearchUrl(pageNumber),
      HttpUtils.getAuthHeader(
        this.jiraSettings.user,
        this.jiraSettings.password
      )
    );

    const isValid = response.status == 200;
    if (!isValid) {
      console.log(await response.text());
      throw "Error retrieving test cases";
    }

    const testCases = await response.json();

    this.testCases = [];
    for (const test of testCases) {
      if (test && test.customFields) {
        var originalIssueKey = this._parseOriginalIssueKey(
          test.customFields[this.jiraSettings.issueKeyCustomField]
        );
        if (
          originalIssueKey >= this.originalIssueKeyStart &&
          originalIssueKey <= this.originalIssueKeyEnd
        ) {
          this.testCases.push(test);
        }
      }
    }
  }

  _parseOriginalIssueKey(str) {
    return parseInt(str.replace(/^\D+/g, ""));
  }

  _getTestUrl() {
    return encodeURI(
      `${this.jiraSettings.url}/rest/atm/1.0/testcase/search?query=status = Deprecated&fields=id,key`
    );
  }

  _getAttachmentsUrl(testCaseKey) {
    return `${this.jiraSettings.url}/rest/atm/1.0/testcase/${testCaseKey}/attachments`;
  }

  _getTestCaseSearchUrl() {
    const baseUrl = `${this.jiraSettings.url}/rest/atm/1.0/testcase`;
    const query = `search?query=projectKey = \"${this.jiraSettings.projectKey}\"`;
    const fields = "&fields=key,customFields";
    const startAt = `&startAt=${this.pageSize * this.currentPage}`;
    const maxResults = `&maxResults=${this.pageSize}`;
    const url = `${baseUrl}/${query}${fields}${startAt}${maxResults}`;
    return encodeURI(url);
  }
}

module.exports = TargetTM4JApi;
