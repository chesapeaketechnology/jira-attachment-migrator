Fork of [SmartBear's tm4j-attachment-migrator](https://bitbucket.org/smartbeartm4j/tm4j-attachment-migrator) to address
a bug with migrating multiple attachments for an issue and add support for migrating attachment for non-test issues.

---

# README

Migrates attachments from Jira issues to test cases in _Zephyr Scale_. The Jira issues where the attachments will be migrated from can be of any type, including Zephyr or Xray test cases.

**NOTE**: this migration script will **not** reupload attachments; meaning, if an attachment with the same file name exists - it will skip the upload

## Requirements

- NodeJs 8.x

## How to use

1. Configure the file `settings.json` with:

- `sourceJira`: this is the Jira instance where the attachments will be exported. The `url`, `user` and `password` to connect to it must be provided. `issueKeyStart` and `issueKeyEnd` provide an open ended range to migrate issues of interest; these keys are optional; by default, all issues will be migrated.
- `targetJira`: this is the Jira instance where Zephyr Scale is installed and where the attachments will be imported. Besides the `url`, `user` and `password` attributes, you must provide the name of a test case custom field with the issue key for retrieving the attachments and the project key of the test cases.

Both source and target Jira can either be the same or different Jira instances.

Example:

```
{
	"sourceJira": {
		"url": "http://myserver.com/jira",
		"user": "myself",
		"password": "mypass",
		"issueKeyStart": "PROJ-###",
    	"issueKeyEnd": "PROJ-###"
	},
	"targetJira": {
		"url": "http://myserver2.com/jira",
		"user": "anotheruser",
		"password": "anotherpass",
		"projectKey": "PROJ",
		"issueKeyCustomField": "Original Issue Key"
	}
}
```

- ⚠ If you see an error similar to that of:
  - "The value 'XXX' does not exist for the field 'project'."
  - Please try leaving `issueKeyCustomField` blank

2. Open a terminal window, and navigate to the directory where the repository has been cloned to: `cd <zephyr-scale-file-converter-dir>`.

3. Install the Javascript dependencies by executing: `npm install`.

4. Run the migration by executing: `npm start`.

All the progess will be logged on the console and the attachments automatically uploaded to Zephyr Scale.

Note: when updating repo, please run `npx prettier --write .` before commiting
