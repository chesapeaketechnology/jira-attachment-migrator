const settings = require("../settings.json");
const JiraApi = require("./jiraApi.js");
const TM4JApi = require("./tm4jApi.js");
const fs = require('fs');

function deleteFolderRecursive(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file, index) {
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

async function migrate() {
	var jiraApi = new JiraApi(settings.sourceJira);
	var tm4jApi = new TM4JApi(settings.targetJira);

	console.log('Validating connection to source Jira...');
	if(!(await jiraApi.validate())) {
		console.log('Error trying to connect to the source Jira instance. Aborting.');
		return;
	}

	console.log('Validating connection to target Jira...');
	if(!(await tm4jApi.validate())) {
		console.log('Error trying to connect to the target Jira instance. Aborting.');
		return;
	}
	
	console.log('Creating directory to store downloaded attachments...');
	deleteFolderRecursive('./attachments');
	fs.mkdirSync('./attachments');

	console.log('All good. Ready to start...\n');

	var testCase;

	let index = 1;
	while(testCase = await tm4jApi.getNextTestCase()) {
		console.log(`#${index++} Test case ${testCase.key}:`);
		var issueKey = tm4jApi.getIssueKey(testCase);
		if(!issueKey) {
			console.log('\tNo issue key has been found. Skipping...');
			continue;
		}
		var attachments = await jiraApi.getAttachments(issueKey);
		if(!attachments.length) {
			console.log(`\tNo attachments to upload from issue ${issueKey}.`);
			continue;	
		}
		console.log(`\tFound ${attachments.length} attachments. Downloading attachments from issue ${issueKey}...`);
		await jiraApi.downloadAttachments(issueKey, attachments);
		console.log(`\tUploading attachments to test case ${testCase.key}...`);
		await tm4jApi.uploadAttachments(issueKey, testCase.key);
	}
	console.log('Migration complete!');
}

migrate();
